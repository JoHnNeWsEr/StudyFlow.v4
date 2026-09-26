from pathlib import Path
import re

pkg='com.studyflow.app'
base=Path('android/app/src/main/java')
path=base.joinpath(*pkg.split('.'))
path.mkdir(parents=True,exist_ok=True)
plugin=path/'StudyFlowFocusPlugin.java'
plugin.write_text(r'''package com.studyflow.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "StudyFlowFocus")
public class StudyFlowFocusPlugin extends Plugin {
    private static final int ID = 8802;
    private static final String CHANNEL = "studyflow_focus_live";

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Live Focus Timer", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Shows the live StudyFlow Focus countdown");
            ch.setSound(null, null);
            ch.enableVibration(false);
            nm.createNotificationChannel(ch);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        long endAt = call.getLong("endAt", 0L);
        String title = call.getString("title", "Focus session");
        if (endAt <= System.currentTimeMillis()) { call.resolve(); return; }
        ensureChannel();
        Intent intent = new Intent(getContext(), MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(getContext(), 8802, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        NotificationCompat.Builder b = new NotificationCompat.Builder(getContext(), CHANNEL)
                .setSmallIcon(getContext().getApplicationInfo().icon)
                .setContentTitle("StudyFlow · Focus")
                .setContentText(title)
                .setSubText("Live countdown")
                .setWhen(endAt)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pi)
                .setAutoCancel(false);
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(ID, b.build());
        call.resolve();
    }

    @PluginMethod
    public void setSystemBars(PluginCall call) {
        String status = call.getString("statusBarColor", "#6A49F5");
        String nav = call.getString("navigationBarColor", "#F7F7FB");
        boolean lightStatus = call.getBoolean("lightStatusBar", false);
        boolean lightNav = call.getBoolean("lightNavigationBar", true);
        try {
            android.view.Window w = getActivity().getWindow();
            w.setStatusBarColor(android.graphics.Color.parseColor(status));
            w.setNavigationBarColor(android.graphics.Color.parseColor(nav));
            int flags = 0;
            if (lightStatus && android.os.Build.VERSION.SDK_INT >= 23) flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (lightNav && android.os.Build.VERSION.SDK_INT >= 26) flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            w.getDecorView().setSystemUiVisibility(flags);
            call.resolve();
        } catch (Exception e) { call.reject("Unable to update system bars", e); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(ID);
        call.resolve();
    }
}
''')

mains=list(Path('android/app/src/main/java').rglob('MainActivity.java'))
if not mains: raise SystemExit('MainActivity.java not found')
m=mains[0]
s=m.read_text()
if 'StudyFlowFocusPlugin' not in s:
    s=s.replace('import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.BridgeActivity;\nimport '+pkg+'.StudyFlowFocusPlugin;')
if 'registerPlugin(StudyFlowFocusPlugin.class)' not in s:
    if 'public class MainActivity extends BridgeActivity {' in s:
        s=s.replace('public class MainActivity extends BridgeActivity {\n}', '''public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        registerPlugin(StudyFlowFocusPlugin.class);\n    }\n}''')
    else:
        raise SystemExit('Unexpected MainActivity format')
m.write_text(s)
print('Added live Android Focus notification plugin:', plugin)
print('Patched MainActivity:', m)
