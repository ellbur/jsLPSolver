
import JSLPSolver from '../src/main.js';

const jsLPSolver = new JSLPSolver();

console.log(jsLPSolver.Solve(
  {
    optimize: "capacity",
    opType: "max",
    constraints: {
      "plane": {"max": 44},
      "person": {"max": 512},
      "cost": {"max": 300000}
    },
    variables: {
      "brit": {
        "capacity": 20000,
        "plane": 1,
        "person": 8,
        "cost": 5000
      },
      "yank": {
        "capacity": 30000,
        "plane": 1,
        "person": 16,
        "cost": 9000
      }
    }
  }
));

