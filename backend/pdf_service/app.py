"""
MEP-light™ — PDF Export Flask Service

Lightweight Flask app exposing a single endpoint:
  POST /api/export-pdf

Accepts JSON payload with full session state and returns a
branded PDF byte stream.

Runs on port 5001 to avoid conflicts with the Node.js API (3001)
and Vite dev server (3000).
"""

import os
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from pdf_generator import generate_pdf

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "MEP-light™ PDF Export Service",
        "version": "1.0.0",
    })


@app.route("/api/export-pdf", methods=["POST"])
def export_pdf():
    """Generate and return the Executive Prioritisation PDF."""
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No JSON payload provided."}), 400

        pdf_bytes = generate_pdf(data)

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=MEP-light_Report.pdf",
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("\n  ╔══════════════════════════════════════════════════╗")
    print("  ║  MEP-light™ PDF Export Service                  ║")
    print(f"  ║  Running on http://0.0.0.0:{port}               ║")
    print("  ║  Endpoints:                                     ║")
    print("  ║    GET  /api/health                             ║")
    print("  ║    POST /api/export-pdf                         ║")
    print("  ╚══════════════════════════════════════════════════╝\n")
    app.run(host="0.0.0.0", port=port, debug=False)
