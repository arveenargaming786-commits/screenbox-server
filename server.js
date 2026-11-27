const http = require('http');
const crypto = require('crypto');

const {
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
  FIREBASE_API_KEY, ADMIN_EMAIL
} = process.env;
const FOLDER = 'screenbox';

function send(res, code, obj){
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(obj));
}

http.createServer(async (req, res) => {
  if(req.method === 'OPTIONS') return send(res, 204, {});
  if(req.url === '/') return send(res, 200, {ok: true});

  if(req.url === '/sign' && req.method === 'POST'){
    try{
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if(!token) return send(res, 401, {error: 'no token'});

      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({idToken: token})
      });
      const j = await r.json();
      const u = j.users && j.users[0];
      if(!u || !u.emailVerified || String(u.email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase()){
        return send(res, 403, {error: 'not admin'});
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = 'folder=' + FOLDER + '&timestamp=' + timestamp;
      const signature = crypto.createHash('sha1').update(toSign + CLOUDINARY_API_SECRET).digest('hex');
      return send(res, 200, {
        signature, timestamp, folder: FOLDER,
        api_key: CLOUDINARY_API_KEY, cloud_name: CLOUDINARY_CLOUD_NAME
      });
    }catch(e){
      return send(res, 500, {error: 'server error'});
    }
  }
  send(res, 404, {error: 'not found'});
}).listen(process.env.PORT || 3000);
