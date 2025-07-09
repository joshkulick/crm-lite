import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: number;
  username: string;
}

interface AddToListRequest {
  list_id: number;
  lead_id?: number;
  lead_ids?: number[];
}

interface RemoveFromListRequest {
  list_id: number;
  lead_id?: number;
  lead_ids?: number[];
}

// Define a type for bulk operation results
interface BulkListOpResult {
  lead_id: number;
  success: boolean;
  error?: string;
  item?: unknown;
}

// POST - Add a customer or customers to a list
export async function POST(request: NextRequest) {
  try {
    console.log('=== ADD TO LIST API CALL ===');
    
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;
    console.log('Auth token present:', !!token);

    if (!token) {
      console.log('No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('User authenticated:', decoded.userId);

    // Parse the request body
    const addData: AddToListRequest = await request.json();

    // Validate required fields
    if (!addData.list_id || (!addData.lead_id && !addData.lead_ids)) {
      return NextResponse.json(
        { error: 'List ID and Lead ID(s) are required' },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    console.log('Checking if list exists:', { list_id: addData.list_id, user_id: decoded.userId });
    const list = await db.get(
      'SELECT id FROM customer_lists WHERE id = $1 AND user_id = $2',
      [addData.list_id, decoded.userId]
    );

    console.log('List check result:', list);

    if (!list) {
      console.log('List not found or does not belong to user');
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Bulk add logic
    const leadIds = addData.lead_ids || (addData.lead_id ? [addData.lead_id] : []);
    console.log('Received lead_ids for bulk add:', leadIds);
    const results: BulkListOpResult[] = [];
    for (const lead_id of leadIds) {
      console.log('Checking lead:', lead_id);
      // Check if lead exists and belongs to user
      const lead = await db.get(
        'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
        [lead_id, decoded.userId]
      );
      console.log('Lead DB result:', lead);
      if (!lead) {
        results.push({ lead_id, success: false, error: 'Lead not found' });
        continue;
      }

      // Check if item already exists in list
      console.log('Checking if item already exists in list:', { list_id: addData.list_id, lead_id: lead_id });
      const existingItem = await db.get(
        'SELECT id FROM customer_list_items WHERE list_id = $1 AND lead_id = $2',
        [addData.list_id, lead_id]
      );
      console.log('Existing item check result:', existingItem);

      if (existingItem) {
        results.push({ lead_id, success: false, error: 'Already in list' });
        continue;
      }

      // Add the item to the list
      console.log('Adding item to list:', { list_id: addData.list_id, lead_id: lead_id });
      
      try {
        const result = await db.run(
          `INSERT INTO customer_list_items (list_id, lead_id, added_at)
           VALUES ($1, $2, $3)
           RETURNING id, list_id, lead_id, added_at`,
          [addData.list_id, lead_id, new Date().toISOString()]
        );
        const newItem = result.rows?.[0];
        if (!newItem) {
          results.push({ lead_id, success: false, error: 'Insert failed' });
        } else {
          results.push({ lead_id, success: true, item: newItem });
        }
      } catch (insertError) {
        console.error('Database insert error:', insertError);
        results.push({ lead_id, success: false, error: 'DB error' });
      }
    }
    // If only one, keep legacy response for compatibility
    if (leadIds.length === 1) {
      const r = results[0];
      if (r.success) {
        console.log('=== SUCCESS: Item added to list ===');
        console.log('New item:', r.item);
        return NextResponse.json({ success: true, message: 'Customer added to list successfully', item: r.item }, { status: 201 });
      } else {
        console.log('=== FAILURE: Item not added to list ===');
        console.log('Error details:', r.error);
        return NextResponse.json({ error: r.error }, { status: 409 });
      }
    }
    // Bulk response
    console.log('=== SUCCESS: Items added to list (bulk) ===');
    console.log('Results:', results);
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('=== ADD TO LIST API ERROR ===');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a customer or customers from a list
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== REMOVE FROM LIST API CALL ===');
    
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;
    console.log('Auth token present:', !!token);

    if (!token) {
      console.log('No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('User authenticated:', decoded.userId);

    // Parse the request body
    const removeData: RemoveFromListRequest = await request.json();

    // Validate required fields
    if (!removeData.list_id || (!removeData.lead_id && !removeData.lead_ids)) {
      return NextResponse.json(
        { error: 'List ID and Lead ID(s) are required' },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    console.log('Checking if list exists:', { list_id: removeData.list_id, user_id: decoded.userId });
    const list = await db.get(
      'SELECT id FROM customer_lists WHERE id = $1 AND user_id = $2',
      [removeData.list_id, decoded.userId]
    );
    console.log('List check result:', list);

    if (!list) {
      console.log('List not found or does not belong to user');
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Bulk remove logic
    const leadIds = removeData.lead_ids || (removeData.lead_id ? [removeData.lead_id] : []);
    const results: BulkListOpResult[] = [];
    for (const lead_id of leadIds) {
      console.log('Checking if lead exists for removal:', { lead_id: lead_id, user_id: decoded.userId });
      const lead = await db.get(
        'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
        [lead_id, decoded.userId]
      );
      console.log('Lead check result for removal:', lead);

      if (!lead) {
        results.push({ lead_id, success: false, error: 'Lead not found' });
        continue;
      }

      // Remove the item from the list
      console.log('Removing item from list:', { list_id: removeData.list_id, lead_id: lead_id });
      
      try {
        const result = await db.run(
          'DELETE FROM customer_list_items WHERE list_id = $1 AND lead_id = $2',
          [removeData.list_id, lead_id]
        );
        console.log('Delete result:', result);
        console.log('Delete rowCount:', result.rowCount);

        if (result.rowCount === 0) {
          results.push({ lead_id, success: false, error: 'Not found in list' });
        } else {
          results.push({ lead_id, success: true });
        }
      } catch (deleteError) {
        console.error('Database delete error:', deleteError);
        results.push({ lead_id, success: false, error: 'DB error' });
      }
    }
    // If only one, keep legacy response for compatibility
    if (leadIds.length === 1) {
      const r = results[0];
      if (r.success) {
        console.log('=== SUCCESS: Item removed from list ===');
        return NextResponse.json({ success: true, message: 'Customer removed from list successfully' });
      } else {
        console.log('=== FAILURE: Item not removed from list ===');
        console.log('Error details:', r.error);
        return NextResponse.json({ error: r.error }, { status: 404 });
      }
    }
    // Bulk response
    console.log('=== SUCCESS: Items removed from list (bulk) ===');
    console.log('Results:', results);
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('=== REMOVE FROM LIST API ERROR ===');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 