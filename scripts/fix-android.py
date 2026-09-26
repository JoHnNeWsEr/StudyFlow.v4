import os, re
# 1) always sign with the SAME key + bump versionCode every build (so updates install over the old app)
p = "android/app/build.gradle"
g = open(p).read()
g = re.sub(r"versionCode \d+", "versionCode " + os.environ.get("RUN", "1"), g, count=1)
if 'file("../../debug.keystore")' not in g:
    g += '''
android {
    signingConfigs {
        debug {
            storeFile file("../../debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
}
'''
open(p, "w").write(g)
# 2) keep the app BELOW the status bar / notch (no drawing under it); JS updates the system bars to match the selected theme
sp = "android/app/src/main/res/values/styles.xml"
s = open(sp).read()
items = '''
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
        <item name="android:statusBarColor">#6A49F5</item>
        <item name="android:windowLightStatusBar">false</item>'''
s = re.sub(r'(<style [^>]*[^/]>)', lambda m: m.group(1) + items, s)
open(sp, "w").write(s)
print("android fixes applied; versionCode =", os.environ.get("RUN", "1"))
