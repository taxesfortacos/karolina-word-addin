// Cloudflare Worker - Comment Queue API
// Stores pending comments and serves them to the Word add-in

const COMMENTS = {}; // In production, use KV storage

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // POST /comments - Add a new comment (from Karolina)
    if (path === '/comments' && request.method === 'POST') {
      const body = await request.json();
      const { docId, searchText, comment } = body;
      
      if (!COMMENTS[docId]) COMMENTS[docId] = [];
      const commentObj = {
        id: Date.now(),
        searchText,
        comment,
        status: 'pending'
      };
      COMMENTS[docId].push(commentObj);
      
      // Also store in KV if available
      if (env.COMMENTS_KV) {
        const existing = await env.COMMENTS_KV.get(docId, 'json') || [];
        existing.push(commentObj);
        await env.COMMENTS_KV.put(docId, JSON.stringify(existing));
      }
      
      return new Response(JSON.stringify({ ok: true, comment: commentObj }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /comments?docId=xxx - Get pending comments (for add-in)
    if (path === '/comments' && request.method === 'GET') {
      const docId = url.searchParams.get('docId') || 'default';
      
      let comments = COMMENTS[docId] || [];
      
      // Also check KV
      if (env.COMMENTS_KV) {
        comments = await env.COMMENTS_KV.get(docId, 'json') || [];
      }
      
      const pending = comments.filter(c => c.status === 'pending');
      
      return new Response(JSON.stringify({ comments: pending }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // POST /comments/ack - Mark comment as processed
    if (path === '/comments/ack' && request.method === 'POST') {
      const { docId, commentId } = await request.json();
      
      if (COMMENTS[docId]) {
        const comment = COMMENTS[docId].find(c => c.id === commentId);
        if (comment) comment.status = 'processed';
      }
      
      if (env.COMMENTS_KV) {
        const comments = await env.COMMENTS_KV.get(docId, 'json') || [];
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
          comment.status = 'processed';
          await env.COMMENTS_KV.put(docId, JSON.stringify(comments));
        }
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Karolina Comment API', { headers: corsHeaders });
  }
};
