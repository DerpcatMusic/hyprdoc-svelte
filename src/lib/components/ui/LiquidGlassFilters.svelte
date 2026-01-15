<svg
  style="position: absolute; width: 0; height: 0; pointer-events: none;"
  aria-hidden="true"
>
  <defs>
    <!-- 
          Liquid Frost Filter
          Combines turbulence for noise/frost texture with displacement 
          to create a refracted, frosted glass look.
        -->
    <filter id="liquid-frost">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.03"
        numOctaves="3"
        result="liquid_noise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="liquid_noise"
        scale="60"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>

    <filter id="liquid-glass-clean">
      <feTurbulence
        type="turbulence"
        baseFrequency="0.01"
        numOctaves="3"
        result="noise"
        seed="1"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="20"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>

    <filter id="frosted-glass">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.5"
        numOctaves="2"
        result="noise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="10"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>

    <filter id="liquid-glass-frost">
      <feTurbulence
        type="turbulence"
        baseFrequency="0.02"
        numOctaves="3"
        result="liquid"
      />
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves="2"
        result="frost"
      />
      <feTurbulence
        type="turbulence"
        baseFrequency="0.02 0.05"
        numOctaves="3"
        seed="5"
        result="liquidTexture"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="liquidTexture"
        scale="20"
        xChannelSelector="R"
        yChannelSelector="G"
      />
      <feGaussianBlur stdDeviation="0.5" />
    </filter>

    <filter id="liquid-frost-grain">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.85"
        numOctaves="4"
        stitchTiles="stitch"
        result="grain"
      />
      <feColorMatrix
        type="saturate"
        values="0"
        in="grain"
        result="grayscale_grain"
      />
      <feComposite
        operator="in"
        in="grayscale_grain"
        in2="SourceGraphic"
        result="grain_overlay"
      />
      <feBlend
        mode="overlay"
        in="grain_overlay"
        in2="SourceGraphic"
        result="grain_blended"
      />
      <feTurbulence
        type="turbulence"
        baseFrequency="0.02"
        numOctaves="3"
        result="liquid"
      />
      <feDisplacementMap
        in="grain_blended"
        in2="liquid"
        scale="30"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>

    <filter id="context-blur" width="500%" height="500%" x="-200%" y="-200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
    </filter>
  </defs>
</svg>
