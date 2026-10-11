import maya.cmds as cmds
import os
import sys
import importlib
import importlib.abc
import importlib.machinery
import importlib.util


def _qt_bindings():
    try:
        from PySide2 import QtCore, QtWidgets
        from shiboken2 import wrapInstance
        return QtCore, QtWidgets, wrapInstance
    except ImportError:
        from PySide6 import QtCore, QtWidgets
        from shiboken6 import wrapInstance
        return QtCore, QtWidgets, wrapInstance


def _flush_qt_deletes():
    """Flush deferred Qt deletions before unloading Python UI modules.

    This is especially important for older Maya/PySide2 builds where removing
    a module while its QWidget is still pending delete can leave a stale
    Shiboken wrapper behind.
    """
    try:
        QtCore, QtWidgets, _ = _qt_bindings()
        app = QtWidgets.QApplication.instance()
        if app is None:
            return
        app.sendPostedEvents(None, QtCore.QEvent.DeferredDelete)
        app.processEvents()
    except (ImportError, AttributeError, RuntimeError):
        pass


def _close_stale_animo_windows(target_name=None):
    """Close only the explicitly requested Animo window.

    Never falls back to closing every *UIWindow child of MayaWindow.
    """
    if not target_name:
        return

    try:
        import maya.OpenMayaUI as _mui
        QtCore, QtWidgets, wrap_instance = _qt_bindings()
        main_ptr = _mui.MQtUtil.mainWindow()
        if not main_ptr:
            return
        main_win = wrap_instance(int(main_ptr), QtWidgets.QMainWindow)
    except (ImportError, AttributeError, RuntimeError):
        return

    for child in main_win.children():
        try:
            if child.objectName() != target_name:
                continue
            child.close()
            child.setParent(None)
            child.deleteLater()
        except (AttributeError, RuntimeError):
            continue

    _flush_qt_deletes()


def _unload_module(module_name):
    """Unload one exact module after its Qt objects have been destroyed."""
    if module_name in sys.modules:
        del sys.modules[module_name]


def _load_module_from_file(module_name, file_path):
    """Load a .py/.pyc launcher as a real module registered in sys.modules.

    Unlike exec(..., {'__name__': '__main__'}), this keeps the Python class,
    instance and Shiboken wrapper associated with a real module for the full
    lifetime of the Qt window. Launcher files may remain self-starting.
    """
    _unload_module(module_name)

    if file_path.lower().endswith('.pyc'):
        loader = importlib.machinery.SourcelessFileLoader(module_name, file_path)
        spec = importlib.util.spec_from_loader(module_name, loader, origin=file_path)
    else:
        spec = importlib.util.spec_from_file_location(module_name, file_path)

    if spec is None or spec.loader is None:
        raise ImportError('Could not create module spec for {}'.format(file_path))

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(module_name, None)
        raise
    return module


LAUNCHER_WINDOW_NAMES = {
    "spacify_launcher": "SpacifyUIWindow",
    "twosify_launcher": "TwosifyUIWindow",
    "tracify_launcher": "TracifyUIWindow",
    "keys_time_launcher": "KeysTimeUIWindow",
    "transify_launcher": "TransifyUIWindow",
    "xform_align_launcher": "XformAlignUIWindow",
    "attributes_space_switcher_launcher": "AttributesSpaceSwitcherUIWindow",
    "fast_anim_layer_launcher": "AnimLayerMergerUIWindow",
    "fast_multi_view_playblaster_launcher": "CameraBookmarkUIWindow",
    "about_launcher": "AnimoUIWindow",
    "pickify_launcher": "PickifyUIWindow",
    "spacify_quick_ctrls_size": "SpacifyCtrlsSizeUIWindow",
    "spacify_quick_change_shape": "SpacifyChangeShapeUIWindow",
    "animref_launcher": "AnimRefUIWindow",
}


class VersionedModuleFinder(importlib.abc.MetaPathFinder):
    """Finder for versioned .pyc files (e.g., module_py2024.pyc)"""
    
    def __init__(self, search_paths, maya_version):
        self.search_paths = search_paths
        self.maya_version = maya_version
    
    def find_spec(self, fullname, path, target=None):
        for search_path in self.search_paths:
            if not os.path.exists(search_path):
                continue
            
            py_path = os.path.join(search_path, fullname + ".py")
            if os.path.exists(py_path):
                return None
            
            versioned_name = "{}_py{}".format(fullname, self.maya_version)
            pyc_path = os.path.join(search_path, versioned_name + ".pyc")
            
            if os.path.exists(pyc_path):
                loader = importlib.machinery.SourcelessFileLoader(fullname, pyc_path)
                return importlib.util.spec_from_loader(fullname, loader, origin=pyc_path)
        
        return None


_versioned_finder = None

def install_versioned_finder(search_paths, maya_version):
    """Install the versioned module finder"""
    global _versioned_finder
    
    if _versioned_finder is not None:
        try:
            sys.meta_path.remove(_versioned_finder)
        except ValueError:
            pass
    
    _versioned_finder = VersionedModuleFinder(search_paths, maya_version)
    sys.meta_path.insert(0, _versioned_finder)


ICON_DATA = [
    ("transify_icon.png", "Anim Transfer", "transify_launcher", "Animo_Transify", None, (26, 26), (0, 0), [
        ("Copy All Channels", "transify_action_copy_all_channels", "Animo_Transify"),
        ("Copy Selected Channels", "transify_action_copy_selected_channels", "Animo_Transify"),
        ("---", None, None),
        ("Replace Animation", "transify_action_replace_animation", "Animo_Transify"),
        ("Insert Animation", "transify_action_insert_animation", "Animo_Transify"),
        ("---", None, None),
        ("Copy Pose", "transify_action_copy_pose", "Animo_Transify"),
        ("Paste Pose", "transify_action_paste_pose", "Animo_Transify"),
        ("---", None, None),
        ("Transify UI", "transify_launcher", "Animo_Transify"),
    ]),
    ("keys_time_icon.png", "Keys Time", "keys_time_launcher", None, None, (23, 23), (0, 0), [
        ("Copy Keys Time", "copy_key_times_pose_to_pose", "Animo_Keys_Time"),
        ("Paste Keys Time", "paste_key_times_pose_to_pose", "Animo_Keys_Time"),
        ("---", None, None),
        ("Copy Keys Time Channels", "copy_key_times_channels", "Animo_Keys_Time"),
        ("Paste Keys Time Channels", "paste_key_times_channels", "Animo_Keys_Time"),
        ("---", None, None),
        ("Open Keys Time UI", "keys_time_launcher", None),
    ]),
    ("fast_anim_layers_icon.png", "Fast Merge animLayers", "fast_anim_layer_launcher", None, None, (23, 23), (0, 0), [("All Layers - Merge", "merge_all_anim_layers", "Animo_Animation_Layers"), ("All Layers - Smart", "smart_merge_all_anim_layers", "Animo_Animation_Layers"), ("---", None, None), ("Selected Layers - Merge", "merge_selected_anim_layers", "Animo_Animation_Layers"), ("Selected Layers - Smart", "smart_merge_selected_anim_layers", "Animo_Animation_Layers"), ("---", None, None), ("animLayer UI", "fast_anim_layer_launcher", None)]),
    ("tweenify_icon.png", "Anim Sliders", "tweenify_launcher", None, None, (24, 24), (0, 0), None),
    ("tracify_icon.png", "Arc Tracker", "tracify_track_arcs", None, None, (24, 24), (0, 0), None),
    ("pickify_icon.png", "Selection Sets", "pickify_launcher", None, None, (26, 26), (0, 0), None),
    ("spacify_icon.png", "Temp Controls", "spacify_launcher", "Animo_Space_Switcher", None, (23, 23), (0, 0), [
        ("World", "spacify_quick_world", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("New Pivot", "spacify_quick_new_pivot", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Relative", "spacify_quick_relative", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("World Orient", "spacify_quick_world_orient", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Group", "spacify_quick_group", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Aim", "spacify_quick_aim", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Temp IK", "spacify_quick_temp_ik", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("FK Chain", "spacify_quick_fk_chain", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("---", None, None),
        ("Assign Camera", "spacify_quick_assign_camera", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Camera Space", "spacify_quick_camera_space", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("---", None, None),
        ("Pick Color", "spacify_quick_color", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("---", None, None),
        ("Ctrls Size", "spacify_quick_ctrls_size", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("---", None, None),
        ("Change Shape", "spacify_quick_change_shape", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("Clean And Bake", "spacify_quick_clean_bake", "Animo_Space_Switcher/Spacify_Quick_Actions"),
        ("---", None, None),
        ("Open Spacify UI", "spacify_launcher", "Animo_Space_Switcher"),
    ]),
    ("xform_align_icon.png", "Xform - Align", "xform_align_launcher", None, None, (23, 23), (0, 0), None),
    ("attributes_space_switcher_icon.png", "Attributes Space Switcher", "attributes_space_switcher_launcher", None, None, (23, 23), (0, 0), None),
    ("temp_pivot_icon.png", "Temp Pivot", "temp_pivot_launcher", None, None, (23, 23), (0, 0), None),
    ("global_offset_icon.png", "Global Offset", "global_offset_launcher", None, None, (28, 28), (0, 0), None),
    ("twosify_icon.png", "Twosify", "twosify_launcher", None, None, (30, 30), (0, 0), [
        ("Quick Select Objects in AnimLayer", "quick_select_objects_in_animlayer", "Animo_Twosify"),
        ("Add Selections to AnimLayer", "add_selections_to_animlayer", "Animo_Twosify"),
        ("---", None, None),
        ("Update Selected Layer", "update_selected_layer", "Animo_Twosify"),
        ("---", None, None),
        ("Open Twosify UI", "twosify_launcher", None),
    ]),
    ("vectorify_icon.png", "Vectorify", "vectorify_launcher", None, None, (25, 25), (0, 0), None),
    ("auto_tangent_icon.png", "Auto Tangent", None, None, None, (24, 24), (0, 0), [("All Keys", "auto_all_launcher"), ("Selected", "auto_current_launcher")]),
    ("linear_tangent_icon.png", "Linear Tangent", None, None, None, (24, 24), (0, 0), [("All Keys", "linear_all_launcher"), ("Selected", "linear_current_launcher")]),
    ("step_tangent_icon.png", "Step Tangent", None, None, None, (24, 24), (0, 0), [("All Keys", "step_all_launcher"), ("Selected", "step_current_launcher")]),
    ("quick_exporter_icon.png", "Quick Exporter", "quick_exporer_launcher", None, None, (24, 24), (0, 0), None),
    ("tools_editor_icon.png", "Tools Editor", "tools_editor_launcher", None, None, (24, 24), (0, 0), None),
    ("about_icon.png", "About", "about_launcher", None, None, (23, 23), (0, 0), None),
    ("reset_icon.png", "Reset Pose", "reset_pose_launcher", None, None, (23, 23), (0, 0), None),
    ("bake_icon.png", "Fast Bake", None, None, None, (23, 23), (0, 0), [("Bake - 7s", "fast_bake_7s", "Animo_Fast_Bake"), ("Bake - 6s", "fast_bake_6s", "Animo_Fast_Bake"), ("Bake - 5s", "fast_bake_5s", "Animo_Fast_Bake"), ("Bake - 4s", "fast_bake_4s", "Animo_Fast_Bake"), ("Bake - 3s", "fast_bake_3s", "Animo_Fast_Bake"), ("Bake - 2s", "fast_bake_2s", "Animo_Fast_Bake"), ("Bake - 1s", "fast_bake_1s", "Animo_Fast_Bake")]),
    ("share_keys.png", "Share Keys", "share_keys_launcher", None, None, (23, 23), (0, 0), None),
    ("SelectOpposite.png", "Select Opposite", None, "Animo_Tools_Editor/animo_tools/tools", None, (22, 22), (0, 0), [("Add Opposite Ctrls", "SelectAddOppositeCtrls", "Animo_Tools_Editor/animo_tools/tools"), ("Select Opposite Ctrls", "SelectOppositeCtrls", "Animo_Tools_Editor/animo_tools/tools")]),
    ("fast_multi_view_playblaster_icon.png", "Multi-View Playblaster", "fast_multi_view_playblaster_launcher", None, None, (23, 23), (0, 0), None),
    ("CropAnimation.png", "Crop Animation", "CropAnimation", "Animo_Tools_Editor/animo_tools/tools", None, (20, 20), (0, 0), None),
    ("DeleteRedundantKeys.png", "Delete Redundant Keys", "DeleteRedundantKeys", "Animo_Tools_Editor/animo_tools/tools", None, (20, 20), (0, 0), None),
    ("SmoothSelectedKeys.png", "Smooth Selected Keys", None, "Animo_Tools_Editor/animo_tools/tools", None, (20, 20), (0, 0), None),
    ("SmartSnapKeys.png", "Smart Snap Keys", "SmartSnapKeys", "Animo_Tools_Editor/animo_tools/tools", None, (20, 20), (0, 0), None),
    ("animref_icon.png", "Animation Reference", "animref_launcher", "Animo_AnimRef", None, (24, 24), (0, 0), None),
]


def run_launcher(animo_data_path, icons_path, maya_version, launcher_name, tool_folder=None, entry_func=None):
    cmds.undoInfo(openChunk=True)
    try:
        common_folders = [
            "Animo_Space_Switcher", 
            "Animo_Tools_Editor", 
            "Animo_Tools_Editor/animo_tools",
            "Animo_Temp_Pivot"
        ]
        for folder in common_folders:
            folder_path = os.path.normpath(os.path.join(animo_data_path, folder))
            if os.path.exists(folder_path) and folder_path not in sys.path:
                sys.path.insert(0, folder_path)
        
        conflicting_modules = ['compat', 'dpi_utils']
        for mod_name in list(sys.modules.keys()):
            if mod_name in conflicting_modules:
                del sys.modules[mod_name]
        
        if tool_folder:
            tool_path = os.path.normpath(os.path.join(animo_data_path, tool_folder))
            if tool_path not in sys.path:
                sys.path.insert(0, tool_path)
            
            install_versioned_finder([tool_path, icons_path], maya_version)
            
            if tool_folder != "Animo_Tools_Editor/animo_tools/tools":
                _close_stale_animo_windows(LAUNCHER_WINDOW_NAMES.get(launcher_name))

            py_path = os.path.normpath(os.path.join(tool_path, launcher_name + ".py"))
            if os.path.exists(py_path):
                _load_module_from_file(launcher_name, py_path)
                return

            pyc_versioned = os.path.normpath(os.path.join(tool_path, "{}_py{}.pyc".format(launcher_name, maya_version)))
            if os.path.exists(pyc_versioned):
                _load_module_from_file(launcher_name, pyc_versioned)
                return

            pyc_path = os.path.normpath(os.path.join(tool_path, launcher_name + ".pyc"))
            if os.path.exists(pyc_path):
                _load_module_from_file(launcher_name, pyc_path)
                return
            
            cmds.warning("Could not find {} in {}. Looked for: {}.py, {}_py{}.pyc, {}.pyc".format(
                launcher_name, tool_path, launcher_name, launcher_name, maya_version, launcher_name))
            return
        else:
            if entry_func:
                _import_and_run(icons_path, launcher_name, maya_version, entry_func)
                return
            
            _close_stale_animo_windows(LAUNCHER_WINDOW_NAMES.get(launcher_name))

            py_path = os.path.normpath(os.path.join(icons_path, launcher_name + ".py"))
            if os.path.exists(py_path):
                _load_module_from_file(launcher_name, py_path)
                return

            pyc_versioned = os.path.normpath(os.path.join(icons_path, "{}_py{}.pyc".format(launcher_name, maya_version)))
            if os.path.exists(pyc_versioned):
                _load_module_from_file(launcher_name, pyc_versioned)
                return

            pyc_path = os.path.normpath(os.path.join(icons_path, launcher_name + ".pyc"))
            if os.path.exists(pyc_path):
                _load_module_from_file(launcher_name, pyc_path)
                return
            
            cmds.warning("Could not find launcher: {}".format(launcher_name))
                
    except Exception as e:
        cmds.warning("Failed to run {}: {}".format(launcher_name, str(e)))
        import traceback
        traceback.print_exc()
    finally:
        cmds.undoInfo(closeChunk=True)


def _import_and_run(icons_path, module_name, maya_version, entry_func=None):
    """Import a module and run its entry function"""
    if icons_path not in sys.path:
        sys.path.insert(0, icons_path)
    
    install_versioned_finder([icons_path], maya_version)
    
    try:
        if module_name in sys.modules:
            _close_stale_animo_windows(LAUNCHER_WINDOW_NAMES.get(module_name))
            del sys.modules[module_name]
        
        module = __import__(module_name)
        
        if entry_func and hasattr(module, entry_func):
            getattr(module, entry_func)()
        elif hasattr(module, 'show'):
            module.show()
        elif hasattr(module, 'main'):
            module.main()
        elif hasattr(module, 'ui'):
            module.ui()
    except Exception as e:
        cmds.warning("Failed to launch {}: {}".format(module_name, str(e)))


def _run_pyc(pyc_path, module_name):
    """Execute a .pyc file"""
    import marshal
    
    try:
        with open(pyc_path, 'rb') as f:
            f.read(16)  
            code = marshal.load(f)
        
        exec_globals = {
            '__name__': '__main__',
            '__file__': pyc_path,
            '__builtins__': __builtins__,
        }
        
        exec(code, exec_globals)
        
    except Exception as e:
        cmds.warning("Failed to launch {}: {}".format(module_name, str(e)))



ICON_OFFSETS = {
    0: -4,   
    1: -3,   
    2: -1,   
    
    5: 0,   
    3: -1,   
    4: 0,   
    
    6: 0,   
    7: 0,   
    8: 0,   
    9: 0,   
    
    10: 1,  
    11: 0,  
    12: 0,  
    
    13: 2,  
    14: 2,  
    15: 0,  
    
    16: 0,  
    17: 3,  
    18: 0,  
    
    19: 2,  
    20: 3,  
    21: 3,  
    
    22: 0,  
    23: 0,  
    24: 0,  
    25: 0,  
    26: 0,  
    27: 0,  
    28: 0,  
}

GROUP_SPACING = 9

ICON_SPACING_WITHIN_GROUP = 2

LEFT_SLIDER_SPACING = 4

SPACING_LEFT_SLIDER_TO_TWEEN = 10
SPACING_TWEEN_TO_BLEND = 14
SPACING_BLEND_TO_TANGENT = 0
SPACING_TANGENT_TO_ICONS = 8
SPACING_ICONS_TO_SCALE = 12
SPACING_SCALE_TO_CASCADE = 12
SPACING_CASCADE_TO_COUNTER = 10
SPACING_COUNTER_TO_SELOPP = 10
SPACING_WHITE_ICONS = 6  
SPACING_DELKEYS_TO_DOCK = 20

TOOLBAR_CONTENT_WIDTH = 1860