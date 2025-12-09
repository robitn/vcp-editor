import { useEffect } from 'react';
import './AboutDialog.css';

interface AboutDialogProps {
    onClose: () => void;
    appName?: string;
    version?: string;
    attributions?: string[];
    settingsPathHint?: string;
}

export default function AboutDialog({ onClose, appName = 'VCP Editor', version = '', attributions = [], settingsPathHint }: AboutDialogProps) {
    useEffect(() => {
        // intentionally left blank - removed debug logging
        return () => {
            // no-op cleanup
        };
    }, [appName, version, attributions, settingsPathHint]);
    return (
        <div className="about-overlay">
            <div className="about-dialog">
                <div className="about-header">
                    <h2>{appName}</h2>
                    {version && <div className="about-version">Version {version}</div>}
                </div>

                <div className="about-body">
                    <h3>Attributions</h3>
                    {attributions && attributions.length > 0 ? (
                        <ul className="attributions-list">
                            {attributions.map((a, i) => (
                                <li key={i}>{a}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="no-attributions">
                            No attributions configured.
                            <div className="hint">Edit the application settings file to add developer attributions.</div>
                            {settingsPathHint && <div className="hint">File: <code>{settingsPathHint}</code></div>}
                        </div>
                    )}
                </div>

                <div className="about-footer">
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
