import { useEffect } from 'react';
import './AboutDialog.css';

interface AboutDialogProps {
    onClose: () => void;
    appName?: string;
    version?: string;
    versionInfo?: {
        full: string;
        major: number;
        minor: number;
        patch: number;
        preRelease: string | null;
        buildDate: string;
        buildTime: string;
        commitHash: string;
    };
    attributions?: string[];
    settingsPathHint?: string;
}

export default function AboutDialog({ onClose, appName = 'VCP Editor', version = '', versionInfo, attributions = [], settingsPathHint }: AboutDialogProps) {
    useEffect(() => {
        // intentionally left blank - removed debug logging
        return () => {
            // no-op cleanup
        };
    }, [appName, version, versionInfo, attributions, settingsPathHint]);
    return (
        <div className="about-overlay">
            <div className="about-dialog">
                <div className="about-header">
                    <h2>{appName}</h2>
                    {versionInfo ? (
                        <div className="about-version-info">
                            <div className="version-major">Version {versionInfo.major}.{versionInfo.minor}.{versionInfo.patch}</div>
                            {versionInfo.preRelease && (
                                <div className="version-prerelease">{versionInfo.preRelease}</div>
                            )}
                            <div className="version-details">
                                <span className="version-build">Build: {versionInfo.buildDate} {versionInfo.buildTime}</span>
                                <span className="version-commit"> • {versionInfo.commitHash}</span>
                            </div>
                        </div>
                    ) : (
                        version && <div className="about-version">Version {version}</div>
                    )}
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
