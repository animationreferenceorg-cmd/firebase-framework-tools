import socket
import sys

print(f"Python version: {sys.version}")
hostname = "google.com"
try:
    print(f"Resolving {hostname}...")
    ip = socket.gethostbyname(hostname)
    print(f"Resolved {hostname} to {ip}")
except socket.gaierror as e:
    print(f"Failed to resolve {hostname}: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
