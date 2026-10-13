# Kobocent iOS project settings, applied on Codemagic after `npx cap add ios` (no Mac needed on our side), 2026-10-13.
#  - Sign in with Apple + push entitlements (App Store 4.8; native push)
#  - Google sign-in URL scheme (the iOS client's reversed client ID, env GOOGLE_IOS_URL_SCHEME)
#  - Export compliance: standard HTTPS only → ITSAppUsesNonExemptEncryption = NO
#  - Display name, portrait on phones, version (APP_VERSION) and build number (IOS_BUILD)
# Run from mobile/:  ruby scripts/ios-setup.rb
require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
plist_path   = 'ios/App/App/Info.plist'
ent_rel      = 'App/App.entitlements'
ent_path     = "ios/App/#{ent_rel}"

File.write(ent_path, <<~PLIST)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>com.apple.developer.applesignin</key>
    <array><string>Default</string></array>
    <key>aps-environment</key>
    <string>production</string>
  </dict>
  </plist>
PLIST

project = Xcodeproj::Project.open(project_path)
target  = project.targets.find { |t| t.name == 'App' } or abort('App target not found')
target.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = ent_rel
  c.build_settings['TARGETED_DEVICE_FAMILY'] = '1'            # iPhone only for the first release
  c.build_settings['MARKETING_VERSION'] = ENV['APP_VERSION'] || '1.0.0'          # shown in the App Store
  c.build_settings['CURRENT_PROJECT_VERSION'] = ENV['IOS_BUILD'] || '1'         # must rise with every upload
end
project.save

def pb(cmd, plist)
  system('/usr/libexec/PlistBuddy', '-c', cmd, plist)
end

pb('Delete :ITSAppUsesNonExemptEncryption', plist_path)
pb('Add :ITSAppUsesNonExemptEncryption bool false', plist_path)
pb('Set :CFBundleDisplayName Kobocent', plist_path) || pb('Add :CFBundleDisplayName string Kobocent', plist_path)
pb('Delete :UISupportedInterfaceOrientations', plist_path)
pb('Add :UISupportedInterfaceOrientations array', plist_path)
pb('Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait', plist_path)

scheme = ENV['GOOGLE_IOS_URL_SCHEME'].to_s.strip
if scheme.empty?
  warn 'GOOGLE_IOS_URL_SCHEME not set — Google sign-in will not return to the app'
else
  pb('Delete :CFBundleURLTypes', plist_path)
  pb('Add :CFBundleURLTypes array', plist_path)
  pb('Add :CFBundleURLTypes:0 dict', plist_path)
  pb('Add :CFBundleURLTypes:0:CFBundleURLSchemes array', plist_path)
  pb("Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string #{scheme}", plist_path)
end

puts 'iOS project configured: entitlements, Info.plist'
