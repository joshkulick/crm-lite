import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

interface AddNoteRequest {
  company_id: number;
  content: string;
}

interface Note {
  id: number;
  lead_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

// GET - Retrieve notes for a specific company (claimed by current user)
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

    // Get company_id from URL params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // First check if this company is claimed by the current user
    const lead = await db.get(
      'SELECT id FROM leads WHERE user_id = $1 AND deal_id = $2',
      [decoded.userId, companyId]
    ) as { id: number } | undefined;

    if (!lead) {
      // Company is not claimed by this user
      return NextResponse.json({
        notes: []
      });
    }

    // Get all notes for this lead
    const notes = await db.all(
      'SELECT id, lead_id, user_id, content, created_at FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC',
      [lead.id]
    ) as Note[];

    return NextResponse.json({ notes });

  } catch (error) {
    console.error('Company notes GET API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new note to a company
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
    const addData: AddNoteRequest = await request.json();

    // Validate required fields
    if (!addData.company_id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    if (!addData.content || addData.content.trim() === '') {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // First check if this company is claimed by the current user
    const lead = await db.get(
      'SELECT id FROM leads WHERE user_id = $1 AND deal_id = $2',
      [decoded.userId, addData.company_id]
    ) as { id: number } | undefined;

    if (!lead) {
      return NextResponse.json(
        { error: 'Company must be claimed before adding notes' },
        { status: 400 }
      );
    }

    // Add the new note
    const result = await db.run(
      'INSERT INTO lead_notes (lead_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, lead_id, user_id, content, created_at',
      [lead.id, decoded.userId, addData.content.trim()]
    );

    const newNote = result.rows[0] as Note;

    return NextResponse.json({ 
      success: true, 
      message: 'Note added successfully',
      note: newNote
    });

  } catch (error) {
    console.error('Add company note API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// PATCH - Edit an existing note (only author can edit)
export async function PATCH(request: NextRequest) {
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
    const { note_id, content } = await request.json();
    if (!note_id || !content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Note ID and new content are required' },
        { status: 400 }
      );
    }
    // Check if the note exists and belongs to the user
    const note = await db.get(
      'SELECT * FROM lead_notes WHERE id = $1',
      [note_id]
    ) as Note | undefined;
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    if (note.user_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only edit your own notes' },
        { status: 403 }
      );
    }
    // Update the note content
    await db.run(
      'UPDATE lead_notes SET content = $1 WHERE id = $2',
      [content.trim(), note_id]
    );
    // Return the updated note
    const updatedNote = await db.get(
      'SELECT * FROM lead_notes WHERE id = $1',
      [note_id]
    );
    return NextResponse.json({ success: true, note: updatedNote });
  } catch (error) {
    console.error('Edit company note API error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}