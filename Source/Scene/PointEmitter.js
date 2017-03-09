/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/Event',
        '../Core/Matrix4',
        '../Core/Math',
        './Particle',
        './PointPlacer'
    ], function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Color,
        Event,
        Matrix4,
        CesiumMath,
        Particle,
        PointPlacer
        ) {
    "use strict";

    var PointEmitter = function(options) {
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this.rate = defaultValue(options.rate, 5);

        this.carryOver = 0.0;

        this.currentTime = 0.0;

        this.bursts = defaultValue(options.bursts, null);

        this.placer = defaultValue(options.placer, new PointPlacer({}));

        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this.complete = new Event();
        this.isComplete = false;
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    PointEmitter.prototype.emit = function(system, dt) {

        // This emitter is finished if it exceeds it's lifetime.
        if (this.isComplete) {
            return;
        }


        // Compute the number of particles to emit based on the rate.
        var v = dt * this.rate;
        var numToEmit = Math.floor(v);
        this.carryOver += (v-numToEmit);
        if (this.carryOver>1.0)
        {
            numToEmit++;
            this.carryOver -= 1.0;
        }


        var i = 0;

        // Apply any bursts
        if (this.bursts) {
            for (i = 0; i < this.bursts.length; i++) {
                var burst = this.bursts[i];
                if ((!defined(burst, "complete") || !burst.complete) && this.currentTime > burst.time) {
                    var count = burst.min + random(0.0, 1.0) * burst.max;
                    numToEmit += count;
                    burst.complete = true;
                }
            }
        }


        for (var i = 0; i < numToEmit; ++i) {
            // Create the new particle.
            var particle = new Particle({
            });

            // Place the particle with the placer.
            this.placer.place( particle );

            //For the velocity we need to add it to the original position and then multiply by point.
            var tmp = new Cartesian3();
            Cartesian3.add(particle.position, particle.velocity, tmp);
            Matrix4.multiplyByPoint(this.modelMatrix, tmp, tmp);

            // Change the position to be in world coordinates
            particle.position = Matrix4.multiplyByPoint(this.modelMatrix, particle.position, particle.position);

            var worldVelocity = new Cartesian3();
            Cartesian3.subtract(tmp, particle.position, worldVelocity);
            Cartesian3.normalize(worldVelocity, worldVelocity);
            particle.velocity = worldVelocity;

            // Add the particle to the particle system.
            system.add(particle);
        }


        this.currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this.currentTime > this.lifeTime) {
            this.isComplete = true;
            this.complete.raiseEvent(this);
        }

    };

    return PointEmitter;
});