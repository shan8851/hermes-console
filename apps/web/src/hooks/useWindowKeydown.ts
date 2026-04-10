import { useEffect, useEffectEvent } from 'react';

type WindowKeydownHandler = (event: KeyboardEvent) => void;

export const useWindowKeydown = (keydownHandler: WindowKeydownHandler): void => {
  const onKeydown = useEffectEvent(keydownHandler);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      onKeydown(event);
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);
};
