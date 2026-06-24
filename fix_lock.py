import subprocess
import os
import time

lock_path = r"C:\Users\aarya\relay-arc\.git\index.lock"

# Kill any git.exe or cmd.exe processes that might hold the lock
print("Killing git processes...")
subprocess.run('taskkill /f /im git.exe', shell=True, capture_output=True)
subprocess.run('taskkill /f /im git-remote-https.exe', shell=True, capture_output=True)
time.sleep(1)

# Try to delete the lock
print("Deleting lock...")
result = subprocess.run(f'del /f "{lock_path}"', shell=True, capture_output=True, text=True)
if result.returncode == 0:
    print("SUCCESS - lock deleted!")
else:
    print("del failed:", result.stderr or result.stdout)
    # Try Python remove
    try:
        os.remove(lock_path)
        print("SUCCESS via os.remove!")
    except Exception as e:
        print("os.remove failed:", e)

input("\nPress Enter to close...")
