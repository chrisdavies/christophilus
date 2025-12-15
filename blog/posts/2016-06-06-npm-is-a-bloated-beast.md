# NPM is a Bloated Beast

At work, we noticed our build process was using over a gig of ram and traced it back to npm. Our npm build is fairly straightforward, and our project size is on the small side. 700 MB for just npm install, and another 500 MB or so for WebPack. WebPack’s memory usage, I can understand. But 700 MB just to download some packages? Seems excessive.

The solution we’ve come up with for now is to launch `npm install` from our build script, and then run webpack as a separate build task instead of launching webpack as an npm postinstall step. Lame, but effective. Takes our peak memory consumption from ~1200 MB to ~700 MB.

The fact that NPM takes such resources underscores the sad truth of modern programming. We see memory and resources as free. We indiscriminantly pull libraries in, only to use a few functions... And the bloat is predictably vast.