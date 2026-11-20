from __future__ import absolute_import, division, print_function

import os
import sys
import maya.cmds as cmds

def get_animo_data_path():
    version_scripts = cmds.internalVar(userScriptDir=True) if cmds else ""
    candidates = [
        os.path.normpath(os.path.join(version_scripts, '..', '..', 'scripts', 'Animo_Data')),
        os.path.normpath(os.path.join(version_scripts, 'Animo_Data')),
        os.path.normpath(os.path.join(os.path.expanduser('~'), 'OneDrive', 'Documents', 'maya', 'scripts', 'Animo_Data')),
        os.path.normpath(os.path.join(os.path.expanduser('~'), 'Documents', 'maya', 'scripts', 'Animo_Data')),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return candidates[0]

def add_to_shelf():
    try:
        animo_data_path = get_animo_data_path()
        icon_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_AnimRef', 'animref_icon.png'))
        if not os.path.exists(icon_path):
            alt_icon = os.path.normpath(os.path.join(animo_data_path, 'Animo_Launcher', 'animref_icon.png'))
            if os.path.exists(alt_icon):
                icon_path = alt_icon
            else:
                icon_path = "commandButton.png"

        current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
        if current_shelf:
            existing_buttons = cmds.shelfLayout(current_shelf, query=True, childArray=True) or []
            for btn in existing_buttons:
                try:
                    if cmds.objectTypeUI(btn, isType="shelfButton") and cmds.shelfButton(btn, query=True, label=True) == "AnimRef":
                        cmds.deleteUI(btn)
                except Exception:
                    pass

        command = '''import sys, os
import maya.cmds as cmds
vscripts = cmds.internalVar(userScriptDir=True)
cands = [
    os.path.normpath(os.path.join(vscripts, '..', '..', 'scripts', 'Animo_Data')),
    os.path.normpath(os.path.join(vscripts, 'Animo_Data')),
    os.path.normpath(os.path.join(os.path.expanduser('~'), 'OneDrive', 'Documents', 'maya', 'scripts', 'Animo_Data')),
    os.path.normpath(os.path.join(os.path.expanduser('~'), 'Documents', 'maya', 'scripts', 'Animo_Data')),
]
animo_data = next((c for c in cands if os.path.isdir(c)), cands[0])
tool_path = os.path.normpath(os.path.join(animo_data, 'Animo_AnimRef'))
if animo_data not in sys.path:
    sys.path.insert(0, animo_data)
if tool_path not in sys.path:
    sys.path.insert(0, tool_path)
for m in list(sys.modules.keys()):
    if 'animref' in m:
        del sys.modules[m]
import animref_launcher
animref_launcher.launch(force_new=True)
'''
        cmds.shelfButton(
            parent=current_shelf,
            image=icon_path,
            label="AnimRef",
            command=command,
            sourceType="python",
            annotation="Animation Reference Browser"
        )
        cmds.inViewMessage(
            amg='<span style="color:#f39c12; font-weight:bold;">Animation Reference added to shelf</span>',
            pos='midCenter', fade=True, fst=250, fad=400
        )
    except Exception as e:
        cmds.warning("Could not add AnimRef to shelf: {}".format(str(e)))

def main():
    add_to_shelf()

if __name__ == "__main__":
    add_to_shelf()
