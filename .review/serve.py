"""Static server for the project + a POST sink so the page can save render captures.

POST /save?name=front  with a data: URL body  ->  writes .review/front.jpg
"""
import base64, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '.review')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        q = urlparse(self.path)
        if q.path != '/save':
            self.send_error(404)
            return
        name = parse_qs(q.query).get('name', ['capture'])[0]
        name = ''.join(c for c in name if c.isalnum() or c in '-_')
        body = self.rfile.read(int(self.headers['Content-Length'])).decode()
        head, _, data = body.partition(',')
        ext = 'png' if 'png' in head else 'jpg'
        path = os.path.join(OUT, f'{name}.{ext}')
        with open(path, 'wb') as f:
            f.write(base64.b64decode(data))
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(path.encode())

    def log_message(self, *a):
        pass


os.makedirs(OUT, exist_ok=True)
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
