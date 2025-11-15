
import React, { useState, useEffect } from 'react';
import type { InterpretationRule, Test } from '../types';
import { getInterpretationRules, createInterpretationRule, updateInterpretationRule } from '../services/api';

interface InterpretationRuleModalProps {
    test: Test;
    organizationId: string;
    onClose: () => void;
}

const InterpretationRuleModal: React.FC<InterpretationRuleModalProps> = ({ test, organizationId, onClose }) => {
    const [analytes, setAnalytes] = useState<InterpretationRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<Partial<InterpretationRule> | null>(null);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const fetchedAnalytes = await getInterpretationRules(organizationId, test.id);
                setAnalytes(fetchedAnalytes);
            } catch (err) {
                setError('Failed to fetch interpretation rules.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRules();
    }, [organizationId, test.id]);

    const handleSave = async () => {
        if (!editingRule) return;

        const ruleData: Partial<InterpretationRule> = {
            organizationId: parseInt(organizationId, 10),
            analyteId: editingRule.analyteId,
            conditionExpression: editingRule.conditionExpression,
            classification: editingRule.classification,
            autoComment: editingRule.autoComment,
            reflexActionText: editingRule.reflexActionText,
            priority: editingRule.priority,
        };

        try {
            if (editingRule.id) {
                const updatedRule = await updateInterpretationRule(editingRule.id, ruleData);
                setAnalytes(analytes.map(a => a.analyteId === updatedRule.analyteId ? { ...a, ...updatedRule } : a));
            } else {
                const newRule = await createInterpretationRule(ruleData);
                setAnalytes(analytes.map(a => a.analyteId === newRule.analyteId ? { ...a, ...newRule } : a));
            }
            setEditingRule(null);
        } catch (err) {
            setError('Failed to save rule.');
        }
    };

    const handleEdit = (analyte: InterpretationRule) => {
        setEditingRule({
            ...analyte,
            organizationId: parseInt(organizationId, 10),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl">
                <h2 className="text-xl font-bold mb-4">Manage Interpretation Rules for {test.testName}</h2>
                {isLoading && <p>Loading rules...</p>}
                {error && <p className="text-red-500">{error}</p>}

                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th>Analyte</th>
                            <th>Condition</th>
                            <th>Classification</th>
                            <th>Auto Comment</th>
                            <th>Reflex Action</th>
                            <th>Priority</th>
                            <th>Source</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytes.map(analyte => (
                            <tr key={analyte.analyteId}>
                                <td>{analyte.analyteName}</td>
                                <td>{analyte.conditionExpression || 'N/A'}</td>
                                <td>{analyte.classification || 'N/A'}</td>
                                <td>{analyte.autoComment || 'N/A'}</td>
                                <td>{analyte.reflexActionText || 'N/A'}</td>
                                <td>{analyte.priority || 'N/A'}</td>
                                <td>{analyte.ruleSource || 'N/A'}</td>
                                <td>
                                    <button onClick={() => handleEdit(analyte)} className="text-indigo-600 hover:text-indigo-900">
                                        {analyte.ruleSource === 'Organization' ? 'Edit' : 'Override'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {editingRule && (
                    <div className="mt-4">
                        <h3 className="text-lg font-bold mb-2">Editing Rule for {editingRule.analyteName}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Condition (e.g., result > 100)" value={editingRule.conditionExpression || ''} onChange={e => setEditingRule({ ...editingRule, conditionExpression: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Classification" value={editingRule.classification || ''} onChange={e => setEditingRule({ ...editingRule, classification: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Auto Comment" value={editingRule.autoComment || ''} onChange={e => setEditingRule({ ...editingRule, autoComment: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Reflex Action" value={editingRule.reflexActionText || ''} onChange={e => setEditingRule({ ...editingRule, reflexActionText: e.target.value })} className="border p-2 rounded" />
                            <input type="text" placeholder="Priority" value={editingRule.priority || ''} onChange={e => setEditingRule({ ...editingRule, priority: e.target.value })} className="border p-2 rounded" />
                        </div>
                        <div className="mt-4">
                            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Save</button>
                            <button onClick={() => setEditingRule(null)} className="ml-2 bg-gray-300 px-4 py-2 rounded-md">Cancel</button>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-right">
                    <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
};

export default InterpretationRuleModal;
