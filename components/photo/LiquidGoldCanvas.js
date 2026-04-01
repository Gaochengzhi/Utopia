import { useEffect, useRef, useState } from "react"

// ─── 默认参数 ─────────────────────────────────────
const DEFAULTS = {
    flowSpeed:     0.1,   // 流动速度      0.05 ~ 2.0
    viscosity:     0.6,   // 粘度          0.0  ~ 1.0
    uvScale:       0.5,   // 密度/粗细     0.3  ~ 3.0
    rippleScale:   5.0,   // 细纹频率      1.0  ~ 20.0
    specPower:     1.2,   // 高光强度      0.0  ~ 3.0
    metaRadius:    0.25,  // 液滴大小      0.05 ~ 0.6
    overlayAlpha:  0.25,  // 遮罩透明度    0.0  ~ 0.8
}

// ─── 参数描述 ─────────────────────────────────────
const PARAM_META = [
    { key: "flowSpeed",    label: "流动速度",   min: 0.05, max: 2.0,  step: 0.01 },
    { key: "viscosity",    label: "粘度",       min: 0.0,  max: 1.0,  step: 0.01 },
    { key: "uvScale",      label: "纹路粗细",   min: 0.3,  max: 3.0,  step: 0.05 },
    { key: "rippleScale",  label: "细纹频率",   min: 1.0,  max: 20.0, step: 0.5  },
    { key: "specPower",    label: "高光强度",   min: 0.0,  max: 3.0,  step: 0.05 },
    { key: "metaRadius",   label: "液滴大小",   min: 0.05, max: 0.6,  step: 0.01 },
    { key: "overlayAlpha", label: "遮罩透明度", min: 0.0,  max: 0.8,  step: 0.01 },
]

export function LiquidGoldCanvas({ className = "" }) {
    const canvasRef    = useRef(null)
    const overlayRef   = useRef(null)
    const paramsRef    = useRef({ ...DEFAULTS })          // WebGL 读这里
    const [params, setParams] = useState({ ...DEFAULTS }) // UI 读这里
    const [open, setOpen]     = useState(false)

    // 同步 UI state → paramsRef（供 render loop 实时读取）
    useEffect(() => {
        paramsRef.current = { ...params }
    }, [params])

    const setParam = (key, value) =>
        setParams(p => ({ ...p, [key]: parseFloat(value) }))

    // ─── WebGL Setup ───────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const gl = canvas.getContext('webgl', {
            alpha: true, antialias: false, preserveDrawingBuffer: false,
        })
        if (!gl) return

        const vertSrc = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`
        const fragSrc = `
precision highp float;
uniform float u_time;
uniform vec2  u_res;
uniform float u_flowSpeed;
uniform float u_viscosity;
uniform float u_uvScale;
uniform float u_rippleScale;
uniform float u_specPower;
uniform float u_metaRadius;
uniform vec2  u_mouse;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p, float t, float visc) {
  float val=0., amp=0.5, freq=1.;
  float decay = 0.45 + visc * 0.2;
  for (int i=0; i<5; i++) {
    val += amp * noise(p * freq + t);
    freq *= 1.8 + visc * 0.2;
    amp  *= decay;
    p    += vec2(1.7, 9.2);
  }
  return val;
}

float warpedField(vec2 p, float t, float visc) {
  vec2 q = vec2(fbm(p+vec2(0,0),t*.5,visc), fbm(p+vec2(5.2,1.3),t*.5,visc));
  vec2 r = vec2(fbm(p+3.*q+vec2(1.7,9.2),t*.7,visc), fbm(p+3.*q+vec2(8.3,2.8),t*.7,visc));
  float f = fbm(p + 2.5*r, t*.4, visc);
  return f + length(q)*0.4 + length(r)*0.3;
}

float metaballs(vec2 p, float t, float radius) {
  float val=0.;
  for (int i=0; i<5; i++) {
    float fi = float(i);
    vec2 center = vec2(
      sin(t*.3+fi*2.1)*.6 + cos(t*.2+fi*1.3)*.3,
      cos(t*.25+fi*1.7)*.6 + sin(t*.15+fi*2.5)*.3
    );
    float r = radius + 0.12*sin(t*.4+fi*3.);
    val += r / (length(p-center)+0.05);
  }
  return val;
}

vec3 getNormal(vec2 p, float t, float visc, float wC) {
  float eps=0.005;
  float hC = wC;
  float hR = warpedField(p+vec2(eps,0),t,visc);
  float hU = warpedField(p+vec2(0,eps),t,visc);
  return normalize(vec3((hC-hR)/eps, (hC-hU)/eps, 1.0));
}

float fresnel(float c, float f0) { return f0+(1.-f0)*pow(1.-c,5.); }

void main() {
  vec2 uv = (gl_FragCoord.xy - u_res*.5) / min(u_res.x, u_res.y);
  float t    = u_time * u_flowSpeed;
  float visc = u_viscosity;
  float sc   = u_uvScale;

  float field = warpedField(uv*sc, t, visc);
  float meta  = metaballs(uv, t, u_metaRadius);

  vec3 normal = getNormal(uv*sc, t, visc, field);

  vec3 viewDir  = normalize(vec3(0,0,1));
  vec3 light1   = normalize(vec3( 0.4, 0.5, 0.9));
  vec3 light2   = normalize(vec3(-0.6,-0.3, 0.7));
  vec3 light3   = normalize(vec3( 0.0, 0.8, 0.5));

  if (u_mouse.x > 0.0) {
    vec2 mUV    = (u_mouse - u_res*.5) / min(u_res.x, u_res.y);
    vec2 toM    = uv - mUV;
    float bump  = exp(-dot(toM,toM)*25.);
    normal      = normalize(normal + vec3(toM*bump*12., 0));
    field      += bump * 0.3;
  }

  vec3 goldBase   = vec3(0.83,0.61,0.22);
  vec3 goldBright = vec3(1.00,0.84,0.45);
  vec3 goldDeep   = vec3(0.55,0.35,0.08);
  vec3 goldShadow = vec3(0.18,0.10,0.02);
  vec3 whiteHot   = vec3(1.00,0.97,0.88);

  float NdotL1 = max(dot(normal,light1),0.);
  float NdotL2 = max(dot(normal,light2),0.);
  float NdotL3 = max(dot(normal,light3),0.);

  vec3 h1 = normalize(light1+viewDir);
  vec3 h2 = normalize(light2+viewDir);
  vec3 h3 = normalize(light3+viewDir);

  float spec1 = pow(max(dot(normal,h1),0.), 120.);
  float spec2 = pow(max(dot(normal,h2),0.),  80.);
  float spec3 = pow(max(dot(normal,h3),0.), 200.);

  float fres = fresnel(max(dot(normal,viewDir),0.), 0.8);

  float fn = smoothstep(0.3,1.8,field);
  vec3 base = mix(goldShadow, goldDeep,   smoothstep(0.,.3,fn));
  base      = mix(base,       goldBase,   smoothstep(.3,.6,fn));
  base      = mix(base,       goldBright, smoothstep(.6,.9,fn));

  vec3 diffuse  = base * (NdotL1*.5 + NdotL2*.3 + NdotL3*.2);
  vec3 specular = mix(goldBright,whiteHot,spec1)*spec1*u_specPower
                + mix(goldBright,whiteHot,spec2*.5)*spec2*0.6
                + mix(goldBright,whiteHot,spec3)*spec3*1.5;

  vec2 reflUv = normal.xy*.5+.5;
  vec3 env    = mix(vec3(.12,.07,.02), vec3(.45,.30,.12), reflUv.y);
  env         = mix(env, vec3(.7,.55,.25), smoothstep(.6,1.,reflUv.y));

  vec3 col = diffuse*.4 + specular*fres + env*fres*.5;
  col += base * 0.12;

  float metaGrad   = abs(meta - 3.5);
  col += goldBright * smoothstep(.5,.0,metaGrad) * 0.3;

  float ripple = noise(uv*u_rippleScale + t*2.);
  ripple = ripple*ripple;
  col += whiteHot * smoothstep(.6,.9,ripple) * 0.08 * fres;

  float dist    = length(uv);
  float vignette = 1. - smoothstep(.3,1.2,dist);
  col *= .35 + vignette*.65;
  col += goldBright * smoothstep(.8,.0,dist) * 0.15;

  // ACES
  col = col*(2.51*col+0.03)/(col*(2.43*col+0.59)+0.14);
  col = pow(col, vec3(0.95,1.0,1.08));

  gl_FragColor = vec4(col, 1.0);
}
`
        function compile(type, src) {
            const s = gl.createShader(type)
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                console.error('Shader error:', gl.getShaderInfoLog(s))
            return s
        }

        const prog = gl.createProgram()
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc))
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc))
        gl.linkProgram(prog)
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, 'a_pos')
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const uTime        = gl.getUniformLocation(prog, 'u_time')
        const uRes         = gl.getUniformLocation(prog, 'u_res')
        const uFlowSpeed   = gl.getUniformLocation(prog, 'u_flowSpeed')
        const uViscosity   = gl.getUniformLocation(prog, 'u_viscosity')
        const uUvScale     = gl.getUniformLocation(prog, 'u_uvScale')
        const uRippleScale = gl.getUniformLocation(prog, 'u_rippleScale')
        const uSpecPower   = gl.getUniformLocation(prog, 'u_specPower')
        const uMetaRadius  = gl.getUniformLocation(prog, 'u_metaRadius')
        const uMouse       = gl.getUniformLocation(prog, 'u_mouse')

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let mouseX = -1, mouseY = -1, rafId, needsResize = true

        const onMouseMove = e => {
            const r = canvas.getBoundingClientRect()
            mouseX = (e.clientX - r.left) * dpr
            mouseY = (canvas.clientHeight - (e.clientY - r.top)) * dpr
        }
        const onMouseLeave = () => { mouseX = -1; mouseY = -1 }

        canvas.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('mouseleave', onMouseLeave)

        const resize = () => {
            needsResize = false
            const w = Math.round(canvas.clientWidth * dpr)
            const h = Math.round(canvas.clientHeight * dpr)
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w; canvas.height = h
                gl.viewport(0, 0, w, h)
                gl.uniform2f(uRes, w, h)
            }
        }
        const onResize = () => { needsResize = true }
        window.addEventListener('resize', onResize)

        const render = now => {
            if (needsResize) resize()
            const p = paramsRef.current
            gl.uniform1f(uTime,        prefersReduced ? 0 : now * 0.001)
            gl.uniform1f(uFlowSpeed,   p.flowSpeed)
            gl.uniform1f(uViscosity,   p.viscosity)
            gl.uniform1f(uUvScale,     p.uvScale)
            gl.uniform1f(uRippleScale, p.rippleScale)
            gl.uniform1f(uSpecPower,   p.specPower)
            gl.uniform1f(uMetaRadius,  p.metaRadius)
            gl.uniform2f(uMouse,       mouseX, mouseY)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            rafId = requestAnimationFrame(render)
        }

        resize()
        rafId = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', onResize)
            canvas.removeEventListener('mousemove', onMouseMove)
            canvas.removeEventListener('mouseleave', onMouseLeave)
            gl.deleteProgram(prog)
            gl.deleteBuffer(buf)
        }
    }, [])  // WebGL 只初始化一次，参数通过 paramsRef 实时传入

    // ─── UI ─────────────────────────────────────────
    return (
        <div className={`relative w-full h-full ${className}`}>
            {/* WebGL canvas */}
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />

            {/* 遮罩层（透明度由参数控制）*/}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `rgba(0,0,0,${params.overlayAlpha})` }}
            />

            {/* 参数控制面板 */}
            <div
                className="absolute top-3 right-3 z-50"
                style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}
            >
                {/* 折叠按钮 */}
                <button
                    onClick={() => setOpen(o => !o)}
                    title="调整参数"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        background: 'rgba(20,14,0,0.65)',
                        border: '1px solid rgba(200,149,60,0.4)',
                        borderRadius: '99px',
                        color: 'rgba(220,170,80,0.85)',
                        fontSize: '10px',
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s',
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5 5h1.55A9.06 9.06 0 0 0 6 17.36l-1.1 1.1a1 1 0 0 0 1.41 1.41l1.1-1.1A9.06 9.06 0 0 0 11 20.95V22.5a1 1 0 0 0 2 0v-1.55A9.06 9.06 0 0 0 17.36 19l1.1 1.1a1 1 0 0 0 1.41-1.41l-1.1-1.1A9.06 9.06 0 0 0 20.95 13H22.5a1 1 0 0 0 0-2h-1.55A9.06 9.06 0 0 0 19 6.64l1.1-1.1a1 1 0 0 0-1.41-1.41l-1.1 1.1A9.06 9.06 0 0 0 13 3.05V1.5a1 1 0 0 0-2 0v1.55A9.06 9.06 0 0 0 6.64 5l-1.1-1.1A1 1 0 0 0 4.13 5.31l1.1 1.1A9.06 9.06 0 0 0 3.05 11H1.5a1 1 0 0 0 0 2h1.55z"/>
                    </svg>
                    {open ? 'CLOSE' : 'PARAMS'}
                </button>

                {/* 展开的面板 */}
                {open && (
                    <div style={{
                        marginTop: '6px',
                        padding: '14px 16px',
                        background: 'rgba(12,8,0,0.80)',
                        border: '1px solid rgba(200,149,60,0.35)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(16px)',
                        minWidth: '210px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{
                            fontSize: '9px',
                            letterSpacing: '0.2em',
                            color: 'rgba(200,149,60,0.5)',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                        }}>
                            LIQUID GOLD · PARAMS
                        </div>

                        {PARAM_META.map(({ key, label, min, max, step }) => (
                            <div key={key} style={{ marginBottom: '12px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '4px',
                                    fontSize: '10px',
                                    color: 'rgba(220,170,80,0.7)',
                                    letterSpacing: '0.05em',
                                }}>
                                    <span>{label}</span>
                                    <span style={{ color: 'rgba(255,210,100,0.9)' }}>
                                        {params[key].toFixed(step < 1 ? 2 : 1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={params[key]}
                                    onChange={e => setParam(key, e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '3px',
                                        appearance: 'none',
                                        background: `linear-gradient(to right, rgba(200,149,60,0.9) 0%, rgba(200,149,60,0.9) ${((params[key]-min)/(max-min))*100}%, rgba(80,60,20,0.4) ${((params[key]-min)/(max-min))*100}%, rgba(80,60,20,0.4) 100%)`,
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        border: 'none',
                                    }}
                                />
                            </div>
                        ))}

                        {/* 重置按钮 */}
                        <button
                            onClick={() => setParams({ ...DEFAULTS })}
                            style={{
                                marginTop: '4px',
                                width: '100%',
                                padding: '5px',
                                background: 'rgba(200,149,60,0.12)',
                                border: '1px solid rgba(200,149,60,0.3)',
                                borderRadius: '6px',
                                color: 'rgba(200,149,60,0.7)',
                                fontSize: '10px',
                                letterSpacing: '0.15em',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={e => e.target.style.background = 'rgba(200,149,60,0.22)'}
                            onMouseOut={e => e.target.style.background = 'rgba(200,149,60,0.12)'}
                        >
                            RESET
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
