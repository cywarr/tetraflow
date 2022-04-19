import * as Tone from 'tone'
class Ambient {
    constructor(){
        const autoPanner = new Tone.AutoPanner(0.5).toDestination().start();
        const fatOsc = new Tone.FatOscillator("Cb1", "sine3", 10).connect(autoPanner).start();

        const autoFilter = new Tone.AutoFilter({ frequency: 0.05, baseFrequency: 220, octaves: 2 }).toDestination().start();
        const noise = new Tone.Noise({ type: "brown", volume: -22 }).connect(autoFilter).start();
    }
}
export {Ambient}