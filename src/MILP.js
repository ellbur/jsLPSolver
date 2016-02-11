/*global describe*/
/*global require*/
/*global module*/
/*global it*/
/*global console*/
/*global process*/
var Solution = require("./Solution.js");

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Cut(type, varIndex, value) {
    this.type = type;
    this.varIndex = varIndex;
    this.value = value;
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function Branch(relaxedEvaluation, cuts) {
    this.relaxedEvaluation = relaxedEvaluation;
    this.cuts = cuts;
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
function MilpSolution(relaxedSolution, iterations) {
    Solution.call(this, relaxedSolution._tableau, relaxedSolution.evaluation, relaxedSolution.feasible);
    this.iter = iterations;
}

MilpSolution.prototype = Object.create(Solution.prototype);
MilpSolution.prototype.constructor = MilpSolution;

//-------------------------------------------------------------------
// Branch sorting strategies
//-------------------------------------------------------------------
function sortByEvaluation(a, b) {
    return b.relaxedEvaluation - a.relaxedEvaluation;
}

//-------------------------------------------------------------------
// Function: MILP
// Detail: Main function, my attempt at a mixed integer linear programming
//         solver
//-------------------------------------------------------------------
function MILP(model) {
    var branches = [];
    var iterations = 0;
    var tableau = model.tableau;

    // This is the default result
    // If nothing is both *integral* and *feasible*
    var bestEvaluation = Infinity;
    var bestBranch = null;

    // And here...we...go!

    // 1.) Load a model into the queue
    var branch = new Branch(-Infinity, []);
    branches.push(branch);

    // If all branches have been exhausted terminate the loop
    while (branches.length > 0) {
        // Get a model from the queue
        branch = branches.pop();
        if (branch.relaxedEvaluation >= bestEvaluation) {
            continue;
        }

        // Solving from initial relaxed solution
        // with additional cut constraints

        // Restoring initial solution
        tableau.restore();

        // Adding cut constraints
        var cuts = branch.cuts;
        tableau.addCutConstraints(cuts);

        // Solving
        tableau.solve();

        if (iterations === 0) {
            // Saving the first iteration
            // TODO: implement a better strategy for saving the tableau?
            tableau.save();
        }

        // Keep Track of how many cycles
        // we've gone through
        iterations++;

        if (tableau.feasible === false) {
            continue;
        }

        var evaluation = tableau.evaluation;
        if (evaluation >= bestEvaluation) {
            // This branch does not contain the optimal solution
            continue;
        }

        // Is the model both integral and feasible?
        if (tableau.isIntegral() === true) {
            // Store the solution as the bestSolution
            bestBranch = branch;
            bestEvaluation = evaluation;
        } else {
            // If the solution is
            //  a. Feasible
            //  b. Better than the current solution
            //  c. but *NOT* integral

            // So the solution isn't integral? How do we solve this.
            // We create 2 new models, that are mirror images of the prior
            // model, with 1 exception.

            // Say we're trying to solve some stupid problem requiring you get
            // animals for your daughter's kindergarten petting zoo party
            // and you have to choose how many ducks, goats, and lambs to get.

            // Say that the optimal solution to this problem if we didn't have
            // to make it integral was {duck: 8, lambs: 3.5}
            //
            // To keep from traumatizing your daughter and the other children
            // you're going to want to have whole animals

            // What we would do is find the most fractional variable (lambs)
            // and create new models from the old models, but with a new constraint
            // on apples. The constraints on the low model would look like:
            // constraints: {...
            //   lamb: {max: 3}
            //   ...
            // }
            //
            // while the constraints on the high model would look like:
            //
            // constraints: {...
            //   lamb: {min: 4}
            //   ...
            // }
            // If neither of these models is feasible because of this constraint,
            // the model is not integral at this point, and fails.

            // Find out where we want to split the solution
            var variable = tableau.getMostFractionalVar();
            // var variable = tableau.getFractionalVarWithLowestCost();
            var varIndex = variable.index;

            var cutsHigh = [];
            var cutsLow = [];

            var nCuts = cuts.length;
            for (var c = 0; c < nCuts; c += 1) {
                var cut = cuts[c];
                if (cut.varIndex === varIndex) {
                    if (cut.type === "min") {
                        cutsLow.push(cut);
                    } else {
                        cutsHigh.push(cut);
                    }
                } else {
                    cutsHigh.push(cut);
                    cutsLow.push(cut);
                }
            }

            var min = Math.ceil(variable.value);
            var max = Math.floor(variable.value);

            var cutHigh = new Cut("min", varIndex, min);
            cutsHigh.push(cutHigh);

            var cutLow = new Cut("max", varIndex, max);
            cutsLow.push(cutLow);

            branches.push(new Branch(evaluation, cutsHigh));
            branches.push(new Branch(evaluation, cutsLow));

            // Sorting branches
            // Branches with the most promising lower bounds
            // will be picked first
            branches.sort(sortByEvaluation);
        }
    }

    // Restoring initial solution
    tableau.restore();

    // Adding cut constraints for the optimal solution
    if (bestBranch !== null) {
        tableau.addCutConstraints(bestBranch.cuts);
        tableau.solve();
        tableau.updateVariableValues();
    }

    // Solving a last time
    return new MilpSolution(tableau.getSolution(), iterations);
}
module.exports = MILP;
