import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: number;
  username: string;
}

interface CreateListRequest {
  name: string;
  description?: string;
}

interface UpdateListRequest {
  name?: string;
  description?: string;
}

// GET - Retrieve all lists for the user
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('list_id');

    if (listId) {
      // Get specific list with its items
      const listQuery = `
        SELECT 
          cl.id,
          cl.name,
          cl.description,
          cl.created_at,
          cl.updated_at,
          COUNT(cli.lead_id) as item_count
        FROM customer_lists cl
        LEFT JOIN customer_list_items cli ON cl.id = cli.list_id
        WHERE cl.id = $1 AND cl.user_id = $2
        GROUP BY cl.id, cl.name, cl.description, cl.created_at, cl.updated_at
      `;

      const list = await db.get(listQuery, [listId, decoded.userId]);

      if (!list) {
        return NextResponse.json(
          { error: 'List not found' },
          { status: 404 }
        );
      }

      // Get list items with lead details
      const itemsQuery = `
        SELECT 
          cli.id,
          cli.lead_id,
          cli.added_at,
          l.company,
          l.contact_name,
          l.phone_numbers,
          l.emails,
          l.pipeline,
          l.status
        FROM customer_list_items cli
        JOIN leads l ON cli.lead_id = l.id
        WHERE cli.list_id = $1
        ORDER BY cli.added_at DESC
      `;

      const items = await db.all(itemsQuery, [listId]);

      // Parse JSON fields for items
      const parsedItems = items.map(item => {
        let phoneNumbers = [];
        let emails = [];

        try {
          phoneNumbers = JSON.parse(item.phone_numbers || '[]');
        } catch {
          console.warn('Failed to parse phone_numbers for list item:', item.lead_id);
        }

        try {
          emails = JSON.parse(item.emails || '[]');
        } catch {
          console.warn('Failed to parse emails for list item:', item.lead_id);
        }

        return {
          ...item,
          phone_numbers: phoneNumbers,
          emails: emails
        };
      });

      return NextResponse.json({
        list: {
          ...list,
          item_count: Number(list.item_count) || 0
        },
        items: parsedItems
      });

    } else {
      // Get all lists for the user
      const listsQuery = `
        SELECT 
          cl.id,
          cl.name,
          cl.description,
          cl.created_at,
          cl.updated_at,
          COUNT(cli.lead_id) as item_count
        FROM customer_lists cl
        LEFT JOIN customer_list_items cli ON cl.id = cli.list_id
        WHERE cl.user_id = $1
        GROUP BY cl.id, cl.name, cl.description, cl.created_at, cl.updated_at
        ORDER BY cl.updated_at DESC
      `;

      const lists = await db.all(listsQuery, [decoded.userId]);

      return NextResponse.json({
        lists: lists.map(list => ({
          ...list,
          item_count: Number(list.item_count) || 0
        }))
      });
    }

  } catch (error) {
    console.error('Lists API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new list
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Parse the request body
    const createData: CreateListRequest = await request.json();

    // Validate required fields
    if (!createData.name || createData.name.trim() === '') {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    // Insert the new list
    const result = await db.run(
      `INSERT INTO customer_lists (name, description, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, created_at, updated_at`,
      [
        createData.name.trim(),
        createData.description?.trim() || null,
        decoded.userId,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    const newList = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'List created successfully',
      list: {
        ...newList,
        item_count: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create list API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a list
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Parse the request body
    const updateData: UpdateListRequest & { list_id: number } = await request.json();

    // Validate required fields
    if (!updateData.list_id) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    const existingList = await db.get(
      'SELECT id FROM customer_lists WHERE id = $1 AND user_id = $2',
      [updateData.list_id, decoded.userId]
    );

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(updateData.name.trim());
      paramIndex++;
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(updateData.description?.trim() || null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add list_id and user_id to values
    updateValues.push(updateData.list_id, decoded.userId);

    const updateQuery = `
      UPDATE customer_lists 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING id, name, description, created_at, updated_at
    `;

    const result = await db.run(updateQuery, updateValues);
    const updatedList = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'List updated successfully',
      list: updatedList
    });

  } catch (error) {
    console.error('Update list API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a list
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('list_id');

    console.log('Delete list request:', { listId, userId: decoded.userId });

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    const existingList = await db.get(
      'SELECT id FROM customer_lists WHERE id = $1 AND user_id = $2',
      [listId, decoded.userId]
    );

    console.log('Existing list check:', existingList);

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Delete the list (cascade will handle list items)
    await db.run(
      'DELETE FROM customer_lists WHERE id = $1 AND user_id = $2',
      [listId, decoded.userId]
    );

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully'
    });

  } catch (error) {
    console.error('Delete list API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 