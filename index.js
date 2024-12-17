const manifestUrl =
    'https://media.axprod.net/TestVectors/Dash/protected_dash_1080p_h264_singlekey/manifest.mpd'; // playready test stream
// const manifestUrl =
//     'https://cdn.bitmovin.com/content/assets/art-of-motion-dash-hls-progressive/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd'; // clear stream
const licenseServerUrl = 'https://drm-playready-licensing.axtest.net/AcquireLicense';
const keySystem = 'com.microsoft.playready';
const customData = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI0MDYwYTg2NS04ODc4LTQyNjctOWNiZi05MWFlNWJhZTFlNzIiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAid3QzRW51dVI1UkFybjZBRGYxNkNCQT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ.l8PnZznspJ6lnNmfAE9UQV532Ypzt1JXQkvrk8gFSRw';
const header = 'X-AxDRM-Message';

function initApp() {
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (shaka.Player.isBrowserSupported()) {
        // Everything looks good!
        initPlayer();
    } else {
        // This browser does not have the minimum set of APIs we need.
        console.error('Browser not supported!');
    }
}

async function initPlayer() {
    // Create a Player instance.
    const video = document.getElementById('video');
    const player = new shaka.Player();
    await player.attach(video);

    // Attach player to the window to make it easy to access in the JS console.
    window.player = player;
    window.video = video;

    player.configure({
        drm: {
            servers: {
                [keySystem]: licenseServerUrl,
            },
        },
        preferredVideoCodecs: ['avc1.640028'],
    })
    // Listen for error events.
    player.addEventListener('error', onErrorEvent);


    player
        .getNetworkingEngine()
        .registerRequestFilter((type, request) => {
            if (
                type !== shaka.net.NetworkingEngine.RequestType.LICENSE ||
                !request ||
                !request.headers
            ) {
                return;
            }
            if (customData) {
                if (keySystem === 'com.microsoft.playready') {
                    request.headers[header] = customData;
                }
            }
        });

    player
        .getNetworkingEngine()
        .registerResponseFilter((type, response) => {
            if (
                type !== shaka.net.NetworkingEngine.RequestType.LICENSE ||
                !response ||
                !response.data ||
                !response.headers ||
                !response.headers['content-type'] ||
                response.headers['content-type'].indexOf(
                    'application/json'
                ) === -1
            ) {
                return;
            }

            const Uint8ArrayUtils = shaka.util.Uint8ArrayUtils;
            try {
                const wrapped = JSON.parse(
                    StringUtils.fromUTF8(response.data)
                );
                response.data = Uint8ArrayUtils.fromBase64(wrapped.license);
            } catch (error) {
                console.log('Error while wrapping license');
            }
        });


    // Try to load a manifest.
    // This is an asynchronous process.
    try {
        await player.load(manifestUrl);
        // This runs if the asynchronous load is successful.
        console.log('The video has now been loaded!');
    } catch (e) {
        // onError is executed if the asynchronous load fails.
        onError(e);
    }
}

function onErrorEvent(event) {
    // Extract the shaka.util.Error object from the event.
    onError(event.detail);
}

function onError(error) {
    // Log the error.
    console.error('Error code', error.code, 'object', error);
}

document.addEventListener('DOMContentLoaded', initApp);