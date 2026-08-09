# Apple Developer Support Case 20000119582501

## Current conclusion

Floatem 1.0.8 (Build 48) remains visible and eligible in TestFlight, but the
installation request fails before any app payload is downloaded. The latest
reproduction returned HTTP 500 from Apple's TestFlight install-data endpoint.

## Apple troubleshooting checklist

| Item requested by Apple | Result |
| --- | --- |
| Tester type | External testing only |
| Enrollment method | Public link |
| Internal and external at the same time | No |
| Tester status in App Store Connect | Anonymous / Accepted on July 25, 2026 |
| Tester name | Not available because the tester joined through a public link |
| Invitation email address | Not applicable because no email invitation was sent |
| Invitation sent date/time | Not applicable because a public link was used |
| Apple Account shown in TestFlight | hankchenchh@gmail.com |
| TestFlight version | 4.0.1 (570.1) |
| Device | MacBook Air (13-inch, M4, 2025), model Mac16,12 |
| macOS | 26.5.2 (25F84) |
| Xcode | 26.0.1 (17A400) |
| App compatibility | TestFlight reports “Available on this Mac” |
| Bundle ID | com.hankch.floatem |
| App Apple ID | 6794372820 |
| TestFlight Build ID | 224777408 |
| App version | 1.0.8 (48) |

Apple documents that public-link testers are shown as anonymous and their name
and invitation email are unavailable in App Store Connect.

## Latest exact reproduction

- Local time: July 28, 2026 at 16:05:07–16:05:09 CST
- Apple response time: July 28, 2026 at 08:05:09 GMT
- Endpoint:
  `https://testflight.apple.com/v2/accounts/.../apps/6794372820/builds/224777408/install`
- HTTP result: `500`
- Server: `daiquiri/5`
- Request ID: `0BFFEBA5-9B0C-4EC1-B010-A3CF22A9C194`
- X-Apple-Jingle-Correlation-Key: `2B4FNGP3NEP5B2XZC5MT466UMM`
- TestFlight failure: `Error Downloading Install Data`
- Previous phase: `ProcessingInstallInitiateResponse`
- Download progress: `null`
- Install progress: `null`

Relevant log excerpt:

```text
App Install Update:
Downloading Install Data

received response, status 500

URL=https://testflight.apple.com/v2/accounts/.../apps/6794372820/builds/224777408/install
code=500
Server=daiquiri/5
X-Apple-Jingle-Correlation-Key=2B4FNGP3NEP5B2XZC5MT466UMM

FAILED: TFBundleInstallation for com.hankch.floatem
buildID=224777408
downloadProgress=(null)
installProgress=(null)
serverFailureReason=Error Downloading Install Data
previousPhaseDescription=ProcessingInstallInitiateResponse
platformName=macOS
```

An earlier confirmed reproduction occurred on July 26, 2026 at approximately
12:07 CST and returned the same HTTP 500 before download.

## Build and signing audit

The existing Build 48 archive passed:

- `codesign --verify --deep --strict`
- Universal architectures: arm64 and x86_64
- Minimum macOS version: 14.0
- Team ID: 85923Q9JUG
- Application identifier: 85923Q9JUG.com.hankch.floatem
- App Group: group.com.hankch.floatem
- App Sandbox enabled in the signed entitlements
- Required app resources present
- Xcode Organizer preparation and upload completed successfully without warnings

However, a fresh App Store Connect export test performed on July 28 failed:

```text
error: exportArchive No Accounts
error: exportArchive No signing certificate "Mac Installer Distribution" found
```

The keychain currently contains valid Apple Development and Apple Distribution
identities, but no local Mac Installer Distribution identity. Xcode account or
cloud-signing access must be restored before submitting a new diagnostic build.

## Remaining controlled tests

1. Restore the Apple Account in Xcode Settings > Accounts and verify the team.
2. Repeat App Store Connect export until it succeeds.
3. Submit a new build number without functional code changes.
4. Temporarily disable the local proxy and repeat installation on a direct
   network connection.
5. If the new build also returns HTTP 500 before download, provide its new
   correlation key to Apple for server-side investigation.

Current proxy configuration during the latest reproduction:

```text
HTTP/HTTPS/SOCKS proxy: 127.0.0.1:7890
```

## Suggested English reply after the remaining tests

Subject: Follow-up for case 20000119582501 — macOS TestFlight install endpoint returns HTTP 500

Hello,

Thank you for your response. I completed the requested checks.

- This is external testing only.
- The tester joined through a public link and is not also an internal tester.
- Because the tester joined through a public link, App Store Connect displays
  the tester as Anonymous. No invitation email was sent, so tester name,
  invitation email, and invitation-sent time are not available.
- Public-link acceptance date: July 25, 2026.
- Apple Account currently shown in TestFlight: hankchenchh@gmail.com.
- TestFlight version: 4.0.1 (570.1).
- Device: MacBook Air (13-inch, M4, 2025), Mac16,12.
- macOS version: 26.5.2 (25F84).
- Xcode version: 26.0.1 (17A400).
- App: Floatem 1.0.8 (Build 48).
- App Apple ID: 6794372820.
- TestFlight Build ID: 224777408.

I reproduced the failure again on July 28, 2026 at 16:05 CST. TestFlight sent
the install request, but Apple's install-data endpoint returned HTTP 500 before
any app payload was downloaded.

Request ID:
0BFFEBA5-9B0C-4EC1-B010-A3CF22A9C194

X-Apple-Jingle-Correlation-Key:
2B4FNGP3NEP5B2XZC5MT466UMM

TestFlight reported:

Error Downloading Install Data
downloadProgress = null
installProgress = null
previousPhase = ProcessingInstallInitiateResponse

Could you please investigate the TestFlight install-data or thinned-variant
generation for App ID 6794372820, Build ID 224777408?

I have attached the complete TestFlight Apple Account window, device window,
App Store Connect public-link tester status, and the installation error
screenshot.

Thank you.
