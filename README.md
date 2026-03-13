# SUMO - PWA game


## Tech stack
- React for app shell: install prompt, settings, start screen, permission button, score UI
- JavaScript game core: canvas, requestAnimationFrame, physics, sensor listeners
- Three.js if we need advanced graphics

## Game play V0.5
- Player is rendered on screen as large sphere or ball
- When user tilts phone the sphere starts accelerating (rolling) in the direction the mobile is tilted
- The speed of the sphere increases as long as the tilt is maintained, faster the more the mobile is tilted.
- Tilting the mobile in another direction make the sphere accelerate in that direction
- The game ends if the sphere hits the edge of the screen

## Game play V1.0
- Multiplayer: 2 or more players on the same screen, controlling their sphere from their own device, trying to push each other into the edges 