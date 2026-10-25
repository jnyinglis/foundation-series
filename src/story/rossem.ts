import type { Story } from './types';

// THE TAZENDA TITHE. A side adventure. A relief mission on Rossem is held
// under tithe by the Tazendian governor. The village hid its drive core.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';
const TOKHAN = 'ELDER TOKHAN';
const SARIN = 'GOVERNOR SARIN';

export const TAZENDA_TITHE: Story = {
  id: 'tazenda-tithe',
  title: 'The Tazenda Tithe',
  subtitle: 'A side adventure',
  contract: {
    world: 'rossem',
    summary: 'A Ponyets House relief mission on Rossem had a third of its cargo seized as tithe by the Tazendian governor, and the village Elders have hidden the ship\'s drive core from him. The House wants the mission flying before winter closes the port.',
    reward: '600 credits and the gratitude of a cold world',
  },
  startWorld: 'rossem',
  baseYear: 210,
  startCredits: 0,
  unlocked: ['rossem'],
  scenes: [
    {
      id: 'rossem-arrive',
      trigger: { type: 'arrive', world: 'rossem' },
      steps: [
        { chapter: 'The Tazenda Tithe', sub: 'Rossem' },
        { say: 'Rossem. A world at the edge of the map where the snow does not melt and the farmers wrap themselves in fur and are governed, lightly and from far away, by Tazenda. Tazenda takes a tithe. Rossem gives it. That is the whole of the arrangement, and it has lasted longer than the Foundation.' },
        { say: 'Foundation ship, this is the Tazendian residency at Gentri. The relief mission in your House\'s name is under tithe assessment. Its cargo is impounded and its drive core is reported missing. You will land at the residency pad and you will not visit the village.', who: COMMS },
        { say: 'Reported missing. A drive core weighs two tons. It did not wander off. Somebody carried it into the snow, and on Rossem the only somebody with a sled is the village.', who: CORIN },
        { say: 'The Elders. They hid it from the governor, not from us. If the mission cannot leave, the governor cannot take its cargo off-world, and the village gets to eat it.', who: ILEN },
        { objective: 'Enter orbit over Rossem. Talk to the Elders, whatever the residency says.' },
      ],
    },
    {
      id: 'rossem-orbit',
      trigger: { type: 'orbit', world: 'rossem' },
      steps: [
        { say: 'You do not land at the residency pad. You put the Kestrel down in a field of snow beside a long low house of logs with smoke coming out of the roof, and before the engines are cold the door opens and a man in furs waves you in out of the wind.' },
        { enter: 'longhouse' },
        { say: 'Fire, fur, the smell of wet wool and smoke. Benches along the walls and old men on them, and at the end an older man in a bearskin with the look of someone who has buried more winters than you have flown.' },
        { say: 'Sit by the fire. Guests sit by the fire. We are a poor people and we have no manners but that one. You are the House\'s pilot. The House sent grain, and medicine, and seed, and the governor sent a tithe assessor, and so the core is under my floor and the governor can stand in the snow and whistle for it.', who: TOKHAN },
        { say: 'He will not whistle. He will burn your stores.', who: ILEN },
        { say: 'He will. He has said so. He comes at dark to say so again. He likes to say things twice.', who: TOKHAN },
        { say: 'The door opens on the wind, and a man in a grey Tazendian uniform comes in with two troopers and a cold that is not only the weather. Governor Sarin. He does not sit. He looks at the fire as at a thing that has been lit without a permit.' },
        { say: 'Pilot. You were told to land at the residency. You landed here. That is a fine. The tithe on the relief cargo is a third, by weight, by the charter of Tazenda, which is older than your Foundation and will outlast it. The core is produced by dark or the village stores are burned as a lesson in arithmetic. I regret the necessity. I regret very little else.', who: SARIN },
        { say: 'You open the sense. Sarin is not cruel. He is afraid, of Tazenda, of a report with his name on it that says a Foundation ship left Rossem without paying. The Elder is not afraid of anything. The Elder is tired, and would like, very much, to be allowed to be kind.', who: TAREN },
        { choice: [
          { text: 'Pay the tithe in credits, on the House\'s account. Let the village keep the grain.', credits: -400, set: ['rossem-pay'] },
          { text: 'Let Ilen read him the charter. Tazenda exempts ships in distress, and Corin can make a log say distress.', set: ['rossem-charter'] },
          { text: 'Reach into Sarin. Make the report in his head already written, and favourable.', set: ['rossem-nudge'], strain: 1 },
        ] },
        { if: ['rossem-pay'], then: [
          { say: 'You put four hundred on the Elder\'s table, in Foundation credits, which on Rossem are worth more than Tazendian ones and everybody present knows it. Sarin counts them with a face that is trying not to be relieved.' },
          { say: 'The tithe is assessed and received. The relief cargo is released. The matter of the core is not in my report. Produce it by morning. Pilot, I will say this once: the House is welcome on Rossem. Tazenda, less so.', who: SARIN },
          { say: 'He said it once. Write that down, girl. It is the first thing in forty years he has said once.', who: TOKHAN },
          { journal: 'Rossem. I paid the governor\'s tithe in credits so the village could keep the grain. Sarin said the House was welcome, once.' },
        ] },
        { if: ['rossem-charter'], then: [
          { say: 'Ilen stands up by the fire with a copy of the Charter of Tazenda, which she has read, because she reads everything. Article nine. A vessel in distress pays no tithe on cargo landed for its own repair.' },
          { say: 'Corin has already made the Kestrel\'s log say distress. It is a very good log. The core, she explains, failed on approach. That is why it was removed. That is why the village had to carry it, in the snow, at the House\'s request. The House is grateful. The House would like it noted.' },
          { say: 'Article nine. I know article nine. Nobody has invoked article nine on Rossem in a hundred years, because nobody on Rossem can read. I will need the log. I will need it to be very good.', who: SARIN },
          { say: 'It is very good.', who: CORIN },
          { say: 'Then the vessel is in distress, the cargo is landed for repair, and there is no tithe. There is a fine for the landing. I will take the fine in grain, which the village will carry to the residency, and the village will, I expect, carry less than it is told.', who: SARIN },
          { say: 'The village is old and the snow is deep. Things fall off sleds.', who: TOKHAN },
          { journal: 'Rossem. Ilen invoked article nine of the Charter of Tazenda, and Corin\'s log said distress. No tithe. The fine was in grain, and things fall off sleds.' },
        ] },
        { if: ['rossem-nudge'], then: [
          { say: 'You find the report in Sarin. It is already half written, in the part of a man that writes reports in his sleep. You finish it for him. The core was never missing. The tithe was taken in kind, and was light, because of the winter. Tazenda will approve. Tazenda will not read it.', who: TAREN },
          { say: 'The matter is closed. The tithe was taken in kind. Light, because of the winter. Produce the core, pilot, and go, and the village keeps its stores, and I have a report to write that I find I have mostly written.', who: SARIN },
          { say: 'He goes out into the dark with his troopers. The Elder watches the door close and then watches you, for a long time, and says nothing, which on Rossem is a kind of speech.' },
          { journal: 'Rossem. I wrote Sarin\'s report inside his head. The Elder watched me, and said nothing.' },
        ] },
        { say: 'In the morning the core comes up through the Elder\'s floor on six men and a sled, and goes into the relief ship, and the relief ship goes up through the snow with a sound the village comes out to hear.' },
        { say: 'The House will pay you. Rossem cannot. But if you are ever cold, pilot, and you will be, there is a bench by this fire with no one on it.', who: TOKHAN },
        { credits: 600 },
        { say: 'Six hundred from the House. Minus what you paid, if you paid. I have stopped counting. I count again at the next port.', who: CORIN },
        { enter: 'space' },
        { complete: 'tazenda-tithe' },
        { objective: '' },
        { end: 'The Tazenda Tithe is complete. The relief mission is flying and the village has its stores.' },
      ],
    },
  ],
};
