from __future__ import absolute_import, division, print_function

try:
    from Animo_AnimRef import animref_launcher
except Exception:
    try:
        import animref_launcher
    except Exception:
        animref_launcher = None

def launch_animref():
    if animref_launcher and hasattr(animref_launcher, 'launch'):
        animref_launcher.launch()
