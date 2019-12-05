import * as alt from 'alt';
import * as native from 'natives';
import { distance, lerpObject } from '/client/utility/vector.mjs';
import { createBlip } from '/client/blips/bliphelper.mjs';
import { PedStream } from '/client/systems/pedstream.mjs';

const logPoints = [
    {
        coord: { x: -476.2215270996094, y: 5304.64990234375, z: 85.78580474853516 },
        rot: { x: -15, y: 0, z: 70 }
    },
    {
        coord: { x: -487.1990661621094, y: 5308.81103515625, z: 82.85572052001953 },
        rot: { x: -15, y: 0, z: 70 }
    },
    {
        coord: { x: -509.5245361328125, y: 5317.08203125, z: 82.83313751220703 },
        rot: { x: 0, y: 0, z: 70 }
    },
    {
        coord: { x: -539.1998901367188, y: 5327.9150390625, z: 76.74703979492188 },
        rot: { x: -10, y: 0, z: 70 }
    },
    {
        // {"x":-548.625244140625,"y":5331.25048828125,"z":74.53607940673828}
        coord: { x: -548.625244140625, y: 5331.25048828125, z: 76.64075469970703 },
        rot: { x: 0, y: 0, z: 70 }
    }
];

const plankHash = native.getHashKey('prop_rub_planks_01');
const logHash = native.getHashKey('prop_log_01');
const pedHash = native.getHashKey('a_m_m_hillbilly_01');
const pedLoc = { x: -471.25677490234375, y: 5304.762890625, z: 85.98503875732422 };
const pedHeading = 163;

function setup() {
    createBlip('lumberworker', pedLoc, 657, 53, 'Lumber Worker');
    const loadHashes = [logHash, plankHash, pedHash];
    loadHashes.forEach(hash => {
        alt.loadModel(hash);
        native.requestModel(hash);
    });

    const pedStream = new PedStream(pedHash, pedLoc, pedHeading);
    pedStream.addInteraction(
        [
            {
                name: 'x1 - Use Unrefined Wood',
                isServer: true,
                eventName: 'lumber:UseUnrefinedWood',
                data: { amount: 1 }
            }
            /*
            {
                name: 'x5 - Use Unrefined Wood',
                isServer: true,
                eventName: 'lumber:UseUnrefinedWood',
                data: { amount: 5 }
            }
            */
        ],
        'Lumber Worker'
    );
    pedStream.addInteractAnimation('anim@mp_player_intupperthumbs_up', 'idle_a', 5898);
}
setup();

/*
1. Make Spawn Log Request Server-Side
2. Keep Track of Coordinate and 'Done' timer.
3. On Done Timer (Spawn Planks and Cut Sound Effect and Add Claimable Wood Count to Player)
4. Right-Click Planks to Pickup
*/

alt.onServer('lumber:SpawnLog', player => {
    spawnLog(player);
});

async function spawnLog(player) {
    const log = native.createObjectNoOffset(
        logHash,
        logPoints[0].coord.x,
        logPoints[0].coord.y,
        logPoints[0].coord.z,
        false,
        false,
        false
    );

    for (let i = 0; i < logPoints.length; i++) {
        native.setEntityRotation(
            log,
            logPoints[i].rot.x,
            logPoints[i].rot.y,
            logPoints[i].rot.z,
            0,
            false
        );
        await lerpObject(log, logPoints[i].coord, 0.01);
    }

    const pos = logPoints[logPoints.length - 1].coord;
    native.deleteEntity(log);
    alt.emitServer('lumber:FinishLog');

    if (distance(alt.Player.local.pos, pos) <= 10) {
        alt.emit('play:Sound', 'woodcut');
        alt.emit(
            'playParticleAtCoords',
            'core',
            'bang_wood',
            50,
            1.5,
            pos.x,
            pos.y,
            pos.z
        );

        alt.emit(
            'playParticleAtCoords',
            'core',
            'ent_anim_dusty_hands',
            50,
            1.5,
            pos.x,
            pos.y,
            pos.z
        );
    }
}

alt.onServer('lumber:SpawnPlanks', () => {
    const pos = logPoints[logPoints.length - 1].coord;
    for (let i = 0; i < 3; i++) {
        const plank = native.createObjectNoOffset(
            plankHash,
            pos.x,
            pos.y,
            pos.z,
            false,
            false,
            false
        );
        native.activatePhysics(plank);
    }
});

alt.on('lumber:Pickup', data => {
    const id = data.id;
    native.deleteEntity(id);
    alt.emitServer('lumber:Pickup');
});
