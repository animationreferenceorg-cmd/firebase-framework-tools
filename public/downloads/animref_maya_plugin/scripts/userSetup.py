"""
AnimationReference.org - Maya Startup Hook (userSetup.py)
Automatically runs when Maya starts to ensure the AnimRef bridge listener is active.
"""

import maya.utils as utils

def _init_animref():
    try:
        import animref_bridge
        animref_bridge.start_server()
        print("[AnimRef] Background bridge initialized on Maya startup.")
    except Exception as e:
        print(f"[AnimRef] Startup hook note: {e}")

# Defer until Maya UI is fully initialized
utils.executeDeferred(_init_animref)
