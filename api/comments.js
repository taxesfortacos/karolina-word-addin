// Simple in-memory store (for POC - would use database in production)
let comments = {};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { docId } = req.query;
  
  if (req.method === 'POST') {
    const { searchText, comment } = req.body;
    if (!comments[docId]) comments[docId] = [];
    
    const newComment = {
      id: Date.now(),
      searchText,
      comment,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    comments[docId].push(newComment);
    
    return res.json({ ok: true, comment: newComment });
  }
  
  if (req.method === 'GET') {
    const pending = (comments[docId] || []).filter(c => c.status === 'pending');
    return res.json({ comments: pending });
  }
  
  res.json({ api: 'karolina-comments' });
}
