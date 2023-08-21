import React from 'react';

interface Props {
  name: string;
  id: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const SliderOption: React.FC<Props> = props => {
  return (
    <div>
      <label htmlFor={props.id}>
        {props.name}: {props.value}
      </label>
      <br />
      <input
        id={props.id}
        type="range"
        step={props.step}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={event => props.onChange(parseFloat(event.target.value))}
      />
    </div>
  );
};

export default SliderOption;
