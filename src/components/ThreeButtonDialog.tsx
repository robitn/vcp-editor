import React from 'react';
import './ThreeButtonDialog.css';

export interface ThreeButtonDialogProps {
  title: string;
  message: string;
  leftButtonLabel: string;
  middleButtonLabel: string;
  rightButtonLabel: string;
  onLeftButton: () => void;
  onMiddleButton: () => void;
  onRightButton: () => void;
  leftButtonStyle?: 'default' | 'primary' | 'danger';
  middleButtonStyle?: 'default' | 'primary' | 'danger';
  rightButtonStyle?: 'default' | 'primary' | 'danger';
}

const ThreeButtonDialog: React.FC<ThreeButtonDialogProps> = ({
  title,
  message,
  leftButtonLabel,
  middleButtonLabel,
  rightButtonLabel,
  onLeftButton,
  onMiddleButton,
  onRightButton,
  leftButtonStyle = 'default',
  middleButtonStyle = 'default',
  rightButtonStyle = 'primary',
}) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className="dialog-header">
          <h2>{title}</h2>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button
            className={`dialog-button dialog-button-left dialog-button-${leftButtonStyle}`}
            onClick={onLeftButton}
          >
            {leftButtonLabel}
          </button>
          <div className="dialog-button-spacer" />
          <button
            className={`dialog-button dialog-button-${middleButtonStyle}`}
            onClick={onMiddleButton}
          >
            {middleButtonLabel}
          </button>
          <button
            className={`dialog-button dialog-button-${rightButtonStyle}`}
            onClick={onRightButton}
          >
            {rightButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreeButtonDialog;
