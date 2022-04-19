import { Object3D } from "three";
import { Background } from "./Background";
import { FlowCircles } from "./FlowCircles";
import { FlowGlow } from "./FlowGlow";
import { FlowLines } from "./FlowLines";
import { FlowPoints } from "./FlowPoints";
import { FlowTetrahedrons } from "./FlowTetrahedrons";

class SuperFlow extends Object3D{
    constructor(camera){
        super();
        this.updatables = [];

        
        let flowTetrahedrons = new FlowTetrahedrons(25000);

        let flowLines = new FlowLines();

        let flowCircles = new FlowCircles();

        let flowPoints = new FlowPoints(50000);

        let flowGlow = new FlowGlow(camera);

        let background = new Background();

        [flowTetrahedrons, flowLines, flowCircles, flowPoints, flowGlow, background].forEach(obj => {
            this.add(obj);
            this.updatables.push(obj);
        })

        this.update = t => {
            this.updatables.forEach(u => u.update(t));
        }        
    }
}
export {SuperFlow}