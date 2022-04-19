import { Vector3 } from "three";
import { CatmullRomCurve3 } from "three";

class FlowCurve{
    constructor(data){
        this.data = data;
        let pCount = 7;
        let pStep = Math.PI * 2 / pCount;
        this.basePoints = new Array(pCount).fill().map((p, idx) => {
            let v = new Vector3(7, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), pStep * idx);
            v.phase = Math.PI * 2 * Math.random();
            return v;
        });
        let points = new Array(pCount).fill().map(p => {return new Vector3()});

        this.curve = new CatmullRomCurve3(points, true);
        this.curve.points.forEach((p, idx) => {
            let bp = this.basePoints[idx];
            p.copy(bp).setY(Math.sin(bp.phase) * 0.5);
        });
        this.curve.updateArcLengths();
        let numPoints = 1023;
        let cPoints = this.curve.getSpacedPoints(numPoints);
        let cObjects = this.curve.computeFrenetFrames(numPoints, true);
        let tData = [];
        cPoints.forEach(v => { tData.push(v.x, v.y, v.z, 0); });
        cObjects.binormals.forEach(v => { tData.push(v.x, v.y, v.z, 0); });
        cObjects.normals.forEach(v => { tData.push(v.x, v.y, v.z, 0); });
        cObjects.tangents.forEach(v => { tData.push(v.x, v.y, v.z, 0); });
        let dataArray = new Float32Array(tData);
        this.data.set(dataArray);
        
        this.update = t => {}
    }
}
export {FlowCurve}