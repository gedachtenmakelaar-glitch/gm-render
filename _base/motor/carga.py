# How busy is the machine, and how much of it a render may take (Dil, 09/10/2026: other projects run at the same time; never
# make the computer slow). Windows (ctypes) and Linux (the GitHub machines: /proc), no extra packages.
#   python motor/carga.py            -> prints CPU, RAM and the suggested number of render workers
#   from carga import medir, workers_sugeridos, prioridad_baja
import ctypes, os, time
if os.name == 'nt':
  from ctypes import wintypes

  class _MEM(ctypes.Structure):
      _fields_ = [('dwLength', wintypes.DWORD), ('dwMemoryLoad', wintypes.DWORD), ('ullTotalPhys', ctypes.c_ulonglong), ('ullAvailPhys', ctypes.c_ulonglong),
                  ('ullTotalPageFile', ctypes.c_ulonglong), ('ullAvailPageFile', ctypes.c_ulonglong), ('ullTotalVirtual', ctypes.c_ulonglong),
                  ('ullAvailVirtual', ctypes.c_ulonglong), ('ullAvailExtendedVirtual', ctypes.c_ulonglong)]

  def _times():
    i, k, u = wintypes.FILETIME(), wintypes.FILETIME(), wintypes.FILETIME()
    ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(i), ctypes.byref(k), ctypes.byref(u))
    f = lambda x: (x.dwHighDateTime << 32) | x.dwLowDateTime
    return f(i), f(k), f(u)

def _medir_linux(seg):
    def st(): v = [int(x) for x in open('/proc/stat').readline().split()[1:]]; return v[3] + v[4], sum(v)
    a = st(); time.sleep(seg); b = st()
    mem = {l.split(':')[0]: int(l.split()[1]) for l in open('/proc/meminfo')}
    return {'cpu': round(100 * (1 - (b[0] - a[0]) / max(1, b[1] - a[1])), 1), 'cores': os.cpu_count(),
            'ram_libre': round(mem['MemAvailable'] / 2**20, 1), 'ram_total': round(mem['MemTotal'] / 2**20, 1)}

def medir(seg=2.0):
    """{'cpu': % busy over seg seconds, 'cores', 'ram_libre': GB, 'ram_total': GB}"""
    if os.name != 'nt': return _medir_linux(seg)
    a = _times(); time.sleep(seg); b = _times()
    idle, total = b[0] - a[0], (b[1] - a[1]) + (b[2] - a[2])
    m = _MEM(); m.dwLength = ctypes.sizeof(_MEM); ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return {'cpu': round(100 * (1 - idle / total), 1) if total else 0.0, 'cores': os.cpu_count(),
            'ram_libre': round(m.ullAvailPhys / 2**30, 1), 'ram_total': round(m.ullTotalPhys / 2**30, 1)}

def workers_sugeridos(r=None):
    """each render worker is a Chrome page with the whole 3D world: ~1.2 GB and ~2 threads. Leave 2.5 GB and half the idle
    threads to the rest of the machine. Between 1 and 6."""
    r = r or medir()
    por_ram = int((r['ram_libre'] - 2.5) // 1.2)
    por_cpu = int(r['cores'] * (1 - r['cpu'] / 100) / 2 / 2)
    return max(1, min(6, por_ram, por_cpu))

def prioridad_baja():
    """this process (and everything it starts) yields to the user's work"""
    if os.name != 'nt':
        try: os.nice(5)
        except Exception: pass
        return
    try: ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)   # BELOW_NORMAL
    except Exception: pass

if __name__ == '__main__':
    r = medir(); print(f"CPU {r['cpu']} % de {r['cores']} hilos | RAM libre {r['ram_libre']} de {r['ram_total']} GB | workers sugeridos: {workers_sugeridos(r)}")
