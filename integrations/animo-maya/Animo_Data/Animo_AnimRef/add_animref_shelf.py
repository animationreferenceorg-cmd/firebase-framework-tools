from __future__ import absolute_import, division, print_function

import os
import sys
import maya.cmds as cmds

def add_to_shelf():
    try:
        animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
        icon_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_AnimRef', 'animref_icon.png'))
        if not os.path.exists(icon_path):
            alt_icon = os.path.normpath(os.path.join(animo_data_path, 'Animo_Launcher', 'animref_icon.png'))
            if os.path.exists(alt_icon):
                icon_path = alt_icon
            else:
                icon_path = "commandButton.png"

        current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
        command = '''import sys, os
import maya.cmds as cmds
animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
tool_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_AnimRef'))
if tool_path not in sys.path:
    sys.path.insert(0, tool_path)
for mod in list(sys.modules.keys()):
    if 'animref_launcher' in mod:
        del sys.modules[mod]
import animref_launcher
animref_launcher.launch()
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
