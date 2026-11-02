"""Sözlüğü, kelime istatistiklerini üretir ve kalite denetimini çalıştırır."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STEPS = ("build_lugat.py", "build_stats.py", "check_lugat.py")

for step in STEPS:
    print(f"\n=== {step} ===", flush=True)
    subprocess.run([sys.executable, str(ROOT / "tools" / step)], cwd=ROOT, check=True)

print("\nSözlük, istatistikler ve denetim tamamlandı.")
