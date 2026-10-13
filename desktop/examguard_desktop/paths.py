import os
import sys

DESKTOP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_resource_path(relative_path):
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    exe_dir = os.path.abspath(os.path.dirname(sys.executable))
    internal_path = os.path.join(exe_dir, "_internal", relative_path)
    if os.path.exists(internal_path):
        return internal_path
    base_path = DESKTOP_DIR
    local_path = os.path.join(base_path, relative_path)
    if os.path.exists(local_path):
        return local_path
    return os.path.join(base_path, "..", "web", relative_path)
