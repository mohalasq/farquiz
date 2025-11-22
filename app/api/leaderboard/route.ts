import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const client = new MongoClient(MONGODB_URI);
const clientPromise = client.connect();

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('farquiz_db');
    const collection = db.collection('leaderboard');

    const scores = await collection
      .find()
      .sort({ score: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      scores.map(score => ({
        id: score._id.toString(),
        name: score.name,
        score: score.score,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, score } = await request.json();
    
    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('farquiz_db');
    const collection = db.collection('leaderboard');

    const result = await collection.insertOne({
      name,
      score,
      date: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Failed to save score:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}