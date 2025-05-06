from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"OK")

def run_health_server():
    server = HTTPServer(("", 3000), HealthCheckHandler)
    server.serve_forever()

if __name__ == "__main__":
    run_health_server() 