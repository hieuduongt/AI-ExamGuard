# -*- mode: python ; coding: utf-8 -*-
# Build: cd desktop && pyinstaller --noconfirm examguard.spec
# Requires the web UI to be exported first (web/out, via `npm run build` in web/).
import os

WEB_OUT = os.path.abspath(os.path.join(SPECPATH, '..', 'web', 'out'))
if not os.path.isdir(WEB_OUT):
    raise SystemExit(f'Missing web build at {WEB_OUT}. Run `npm run build` in web/ first.')


a = Analysis(
    [os.path.join(SPECPATH, 'app_desktop.py')],
    pathex=[SPECPATH],
    binaries=[],
    datas=[(WEB_OUT, 'out')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=os.environ.get('EXAMGUARD_EXE_NAME', 'AI_ExamGuard_Portable'),
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
