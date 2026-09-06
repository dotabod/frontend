using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class DotaCapture {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lparam);

  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lparam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, IntPtr pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassNameW(IntPtr hwnd, StringBuilder buffer, int size);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hwnd, ref POINT point);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
  [DllImport("user32.dll", SetLastError = true)] static extern bool SystemParametersInfoA(uint action, uint param, ref uint value, uint flags);
  [DllImport("user32.dll", SetLastError = true)] static extern bool SystemParametersInfoA(uint action, uint param, IntPtr value, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }

  const int SW_SHOW = 5;
  const int SW_RESTORE = 9;
  const uint SPI_GETFOREGROUNDLOCKTIMEOUT = 0x2000;
  const uint SPI_SETFOREGROUNDLOCKTIMEOUT = 0x2001;

  static uint GetForegroundLockTimeout() {
    uint value = 0;
    if (!SystemParametersInfoA(SPI_GETFOREGROUNDLOCKTIMEOUT, 0, ref value, 0)) {
      throw new InvalidOperationException("Could not read the foreground-lock timeout.");
    }
    return value;
  }

  static bool TrySetForegroundLockTimeout(uint value) {
    return SystemParametersInfoA(
      SPI_SETFOREGROUNDLOCKTIMEOUT,
      0,
      new IntPtr((long)value),
      0
    );
  }

  public static List<IntPtr> WindowsForProcess(uint target) {
    var found = new List<IntPtr>();
    EnumWindows(delegate(IntPtr hwnd, IntPtr lparam) {
      uint pid;
      GetWindowThreadProcessId(hwnd, out pid);
      if (pid == target) found.Add(hwnd);
      return true;
    }, IntPtr.Zero);
    return found;
  }

  public static string ClassName(IntPtr hwnd) {
    var buffer = new StringBuilder(256);
    GetClassNameW(hwnd, buffer, buffer.Capacity);
    return buffer.ToString();
  }

  // Restores a hidden or minimized client and takes the foreground. Dota clears
  // WS_VISIBLE rather than setting WS_MINIMIZE when it is backgrounded, so
  // IsIconic alone does not tell you whether the window needs restoring.
  public static bool Reveal(IntPtr hwnd) {
    uint foregroundLockTimeout = GetForegroundLockTimeout();
    bool changedForegroundLockTimeout = TrySetForegroundLockTimeout(0);
    try {
      uint self = GetCurrentThreadId();
      uint foreground = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);

      AttachThreadInput(foreground, self, true);
      try {
        // SW_RESTORE is only correct for a minimized window -- on a maximized one
        // it would shrink the player's client back to its pre-maximized size.
        if (IsIconic(hwnd)) ShowWindow(hwnd, SW_RESTORE);
        else if (!IsWindowVisible(hwnd)) ShowWindow(hwnd, SW_SHOW);
        BringWindowToTop(hwnd);
        SetForegroundWindow(hwnd);
      } finally {
        AttachThreadInput(foreground, self, false);
      }

      return GetForegroundWindow() == hwnd;
    } finally {
      if (changedForegroundLockTimeout && !TrySetForegroundLockTimeout(foregroundLockTimeout)) {
        throw new InvalidOperationException("Could not restore the foreground-lock timeout.");
      }
    }
  }
}
