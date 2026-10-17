import { stepTime, stepUnit, steppers, type StepperView } from '../lib/model';
import './RateSteppers.css';

interface Props {
  name: string;
  view: StepperView;
  down: string;
  up: string;
  onStep: (direction: 1 | -1) => void;
}

function Stepper({ name, view, down, up, onStep }: Props) {
  return (
    <div class="stepper" role="group" aria-label={name}>
      <button
        type="button"
        class="stepper-button"
        aria-label={down}
        disabled={!view.canDown}
        onClick={() => {
          onStep(-1);
        }}
      >
        −
      </button>
      <span class="stepper-middle">
        <span class="stepper-name">{name}</span>
        <span class="stepper-value figures">{view.value}</span>
      </span>
      <button
        type="button"
        class="stepper-button"
        aria-label={up}
        disabled={!view.canUp}
        onClick={() => {
          onStep(1);
        }}
      >
        +
      </button>
    </div>
  );
}

/**
 * Unit and time, each always meaning one thing (D17): the coin money arrives in, and the
 * time frame amounts are shown over.
 */
export function RateSteppers() {
  const { unit, time } = steppers.value;
  return (
    <div class="steppers">
      <Stepper name="unit" view={unit} down="Smaller unit" up="Bigger unit" onStep={stepUnit} />
      <Stepper name="time" view={time} down="Shorter time" up="Longer time" onStep={stepTime} />
    </div>
  );
}
