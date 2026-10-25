import type { Story } from './types';

// THE TIME VAULT. A side adventure, offered after Kalgan. The Vault's recorder
// ran for eleven minutes with nobody in the room. Somebody breathed.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';
const DORNE = 'KEEPER DORNE';
const AMMEL = 'CHAIR AMMEL';
const STUDENT = 'STUDENT';

export const TIME_VAULT: Story = {
  id: 'time-vault',
  title: 'The Time Vault',
  subtitle: 'A side adventure',
  contract: {
    world: 'terminus',
    summary: 'The Time Vault on Terminus ran an unscheduled self-test. Its keeper will not say more on an open channel. The Encyclopedia Board wants it looked at quietly, by someone who is not from Terminus.',
    reward: '600 credits from the Board, quietly',
    requires: ['kalgan-watched'],
  },
  startWorld: 'terminus',
  baseYear: 210,
  startCredits: 0,
  unlocked: ['terminus'],
  scenes: [
    {
      id: 'vault-arrive',
      trigger: { type: 'arrive', world: 'terminus' },
      steps: [
        { chapter: 'The Time Vault', sub: 'Terminus' },
        { say: 'Terminus. The Foundation\'s own world, at the end of everything, where Hari Seldon put a hundred thousand Encyclopedists and a vault, and left. The vault opens at crises. There is no crisis. The vault has done something anyway.' },
        { say: 'Trader vessel, Terminus City control. You are expected. The Board asks that you come to the Vault directly, by the service road, and that you do not file a reason.', who: COMMS },
        { say: 'The Vault keeper is Dorne. I knew him when he was a clerk. He is not a man who calls the Board at night.', who: ILEN },
        { say: 'Nobody who is not from Terminus is allowed in that room. The Board is bending a rule it would hang a Trader for. Either it is frightened or it is testing you. On Terminus it is usually both.', who: CORIN },
        { objective: 'Enter orbit over Terminus. Go to the Time Vault by the service road.' },
      ],
    },
    {
      id: 'vault-orbit',
      trigger: { type: 'orbit', world: 'terminus' },
      steps: [
        { say: 'The service road. A door with no sign. And then the room every schoolchild in the Foundation has seen in pictures: rows of seats, a wall, and a glass cubicle with an empty chair in it where, three times in two centuries, a dead man has sat down and talked.' },
        { enter: 'timevault' },
        { say: 'Keeper Dorne is a small grey man who has not slept. Chair Ammel of the Board stands beside him as a wall stands beside a door. In the back row, where the public sits at openings, a young woman with a student\'s satchel is reading something, and does not look up.' },
        { say: 'Encyclopedist Sarvo. And the pilot. Thank you. I will say this once, because the Chair has asked me to and because I need to say it to someone. Two nights ago, at the third hour, the Vault\'s recorder activated. Not the projector. The recorder. It recorded for eleven minutes. There is no recorder on the schedule. There is no schedule for a recorder. Seldon did not leave one.', who: DORNE },
        { say: 'The Board\'s position is that the Vault performed a self-test. That is the position. It has been the position since the morning after. I have asked the pilot here because the pilot is not from Terminus, and will leave, and because Sarvo says he sees things.', who: AMMEL },
        { say: 'I played it back. The eleven minutes. There is nothing on it. There is a room, and the seats, and the chair, and nothing. And at the ninth minute, somebody breathes.', who: DORNE },
        { say: 'You open the sense. Dorne is telling the truth and is more frightened of it than of the Board. Ammel is lying, carefully, to herself, and knows it. And in the back row the student is not reading. The student is a closed hand. You have met this hand before, on Kalgan, across a table.', who: TAREN },
        { say: 'What do you want from us, Keeper?', who: ILEN },
        { say: 'I want somebody to tell me what to write in the log.', who: DORNE },
        { choice: [
          { text: 'Tell him to write: self-test, nominal. Let the Vault keep its secret.', set: ['vault-silent'] },
          { text: 'Let Ilen take the eleven minutes for the Encyclopedia. Everything gets written down somewhere.', set: ['vault-record'] },
          { text: 'Reach into Dorne. Take the night away from him.', set: ['vault-nudge'], strain: 1 },
        ] },
        { if: ['vault-silent'], then: [
          { say: 'You tell him. Self-test, nominal. He writes it, slowly, like a man signing something, and when he has written it he looks ten years older and a great deal calmer.' },
          { say: 'That is the position. The Board thanks the pilot. The Board will not remember the pilot\'s name, which is the greatest courtesy the Board has.', who: AMMEL },
          { journal: 'Terminus. The Vault\'s recorder ran for eleven minutes and somebody breathed on the ninth. I told Dorne to log it as a self-test. The Board was grateful not to know.' },
        ] },
        { if: ['vault-record'], then: [
          { say: 'Ilen copies the eleven minutes onto a cube the size of a thumb. Ammel watches her do it with the face of a woman watching a fire start in a building she does not own.' },
          { say: 'That cube does not exist. The Encyclopedia does not have it. If it is ever found in the Encyclopedia, the Encyclopedia will have found it somewhere else.', who: AMMEL },
          { say: 'Everything is found somewhere else, Chair. That is what an encyclopedia is.', who: ILEN },
          { journal: 'Terminus. The Vault\'s recorder ran for eleven minutes and somebody breathed on the ninth. Ilen has the eleven minutes on a cube that does not exist.' },
        ] },
        { if: ['vault-nudge'], then: [
          { say: 'You find the night in Dorne. The third hour, the recorder, the ninth minute. You do not take it. You fold it, the way a man folds a letter he will read again when he is braver, and you put it where he will not find it for a long time.', who: TAREN },
          { say: 'The self-test. Yes. Self-test, nominal. I had thought there was something else. I had not slept. Thank you for coming, Encyclopedist. I do not know why the Chair called you.', who: DORNE },
          { say: 'Ammel looks at Dorne, and then at you, and decides to be relieved rather than curious. It is the Board\'s oldest skill.' },
          { journal: 'Terminus. I folded the night away inside Keeper Dorne. He thinks the Vault ran a self-test. The Chair decided not to be curious.' },
        ] },
        { say: 'On the way out the student is standing by the door, as if she had always been there. She is young, and plain, and unremarkable, and she looks at you the way nobody has looked at you in sixty years: as if she knew exactly what she was looking at.' },
        { say: 'You are being careful. Keep being careful. Nobody is in your way, pilot. Nobody will be. That is not a kindness. It is a decision, and it was not mine to make, and it was made a long time ago.', who: STUDENT },
        { say: 'You reach for her, and there is nothing to reach. Not a closed hand this time. An open one, with nothing in it, held out for you to see.', who: TAREN },
        { say: 'The breath on the recording was mine. I wanted to know if the room still listens. It does. Goodbye.', who: STUDENT },
        { say: 'She goes out into the Terminus afternoon with her satchel and does not look back, and nobody in the room but you saw her leave, and Ilen, who sees everything, is looking at you.' },
        { set: ['vault-watched'] },
        { journal: 'Terminus. The student by the door spoke to me. She said I was being careful, and to keep being careful, and that nobody would be in my way. She said the breath on the recording was hers. I could not read her. She let me see that I could not.' },
        { credits: 600 },
        { say: 'Six hundred, from a fund the Board does not have, for a visit that did not happen. Fly well, pilot.', who: AMMEL },
        { enter: 'space' },
        { complete: 'time-vault' },
        { objective: '' },
        { end: 'The Time Vault is complete. The Board has its position. Somebody on Terminus knows what you are.' },
      ],
    },
  ],
};
