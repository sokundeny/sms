import { useEffect, useState } from "react";

const UserModal = ({ user, roles, isOpen, onClose, onSaveRoles, onGrant, onRevoke, onDelete }) => {
    const [ localRoles, setLocalRoles] = useState([]);
    const [ localUser, setLocalUser ] = useState()
    const [ selectedTab, setSelectedTab ] = useState("roles");
    const [localTables, setLocalTables] = useState([]);
    const [localPerms, setLocalPerms] = useState([]);

    // const tabs = ["roles", "privileges"];
    const permissions = ["ALTER", "CREATE", "DELETE", "DROP", "INSERT", "SELECT", "UPDATE"];
    const tables = ["categories", "customers", "developer", "reviews", "software", "transactions"];
    
    useEffect(() => {
        if (isOpen) {
            setLocalTables([]);
            setLocalPerms([]);
        }
        setLocalUser(user)
        setLocalRoles(user?.roles || []);
    }, [user]);

    if (!isOpen) return null;

    const toggleRole = (roleName) => {
        setLocalRoles((prev) => {
            const found = prev.find(r => r.role === roleName);
            if (found) {
                return prev.filter(r => r.role !== roleName);
            } else {
                return [...prev, { role: roleName, is_admin_option: false }];
            }
        });
    };

    const toggleAdminOption = (roleName) => {
        setLocalRoles((prev) =>
            prev.map(r =>
                r.role === roleName ? { ...r, is_admin_option: !r.is_admin_option } : r
            )
        );
    };

    const handleTableToggle = (table) => {
        const isChecked = localTables.includes(table);
        const updatedTables = isChecked
            ? localTables.filter(t => t !== table)
            : [...localTables, table];

        setLocalTables(updatedTables);
    };

    const handlePermissionToggle = (permission) => {
        setLocalPerms(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleSave = () => {
        const original = new Map((user?.roles || []).map(r => [r.role, r.is_admin_option]));
        const updated = new Map(localRoles.map(r => [r.role, r.is_admin_option]));

        const toAdd = [];
        const toRemove = [];

        for (const [role, isAdmin] of updated) {
            if (!original.has(role) || original.get(role) !== isAdmin) {
                toAdd.push({ role, is_admin_option: isAdmin });
            }
        }

        for (const [role] of original) {
            if (!updated.has(role)) {
                toRemove.push(role);
            }
        }

        onSaveRoles(user, toAdd, toRemove); // Make sure this gets called!
        onClose();
    };

    const handleGrantPermission = () => {

        onGrant(user.user, localPerms, localTables)

        const updatedTables = [...user.tables];

        localTables.forEach(table => {
            const formattedTable = `\`your_db\`.\`${table}\``;
            const existing = updatedTables.find(t => {
                const match = t.table.match(/`[^`]+`\.`([^`]+)`/);
                const tableName = match ? match[1] : t.table;
                return tableName === table;
            });

            if (existing) {
                const mergedPerms = Array.from(new Set([...existing.permissions, ...localPerms]));
                existing.permissions = mergedPerms;
            } else {
                updatedTables.push({
                    table: formattedTable,
                    permissions: localPerms,
                });
            }
        });

        setLocalUser({
            ...localUser,
            tables: updatedTables,
        });

        setLocalPerms([])
        setLocalTables([])

    }

    const handleRevokePermission = (name, perms) => { 
        const tablesArray = [name];   
        onRevoke(user.user, perms, tablesArray);
        setLocalUser({
            ...localUser,
            tables: localUser.tables.filter(item => {
                const match = item.table.match(/`[^`]+`\.`([^`]+)`/);
                const tableName = match ? match[1] : item.table;
                return tableName !== name;
            }),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black bg-black bg-opacity-30">
            <div className="bg-white w-full max-w-md p-6 rounded shadow-lg relative">
                <h2 className="text-xl font-semibold mb-4">
                    Manage User
                    <input
                        type="text"
                        className="w-full mt-4 p-2 border border-gray-300 rounded font-normal text-base"
                        value={user.user}
                        readOnly
                    />
                </h2>
                <div className="flex border-b">
                    <button className={`${selectedTab === "roles" ? "border-blue-500 text-blue-600 font-medium border-b-2" 
                                        : "text-gray-600 hover:text-blue-600 "} px-4 py-2 cursor-pointer`}
                            onClick={() => setSelectedTab("roles")}
                    >
                        Roles
                    </button>
                    <button className={`${selectedTab === "privileges" ? "border-blue-500 text-blue-600 font-medium border-b-2" 
                                        : "text-gray-600 hover:text-blue-600 "} px-4 py-2 cursor-pointer`}
                            onClick={() => setSelectedTab("privileges")}
                    >
                        Privileges
                    </button>
                </div>

                <div className="space-y-3 mb-6 overflow-y-scroll h-80 py-2">
                    {selectedTab === "roles" ? 
                    (roles.map(({ role }) => {
                        const isChecked = localRoles.some(r => r.role === role);
                        const isAdmin = localRoles.find(r => r.role === role)?.is_admin_option || false;

                        return (
                            <div key={role} className="flex flex-col gap-1 border rounded p-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleRole(role.toUpperCase())}
                                    />
                                    <span>{role.toUpperCase()}</span>
                                </label>
                                {isChecked && (
                                    <label className="flex items-center gap-2 text-sm text-blue-700 pl-6">
                                        <input
                                            type="checkbox"
                                            checked={isAdmin}
                                            onChange={() => toggleAdminOption(role.toUpperCase())}
                                        />
                                        <span>Admin Option</span>
                                    </label>
                                )}
                            </div>
                        );
                    })) 
                    : (
                        <div>
                            <h3 className="my-2 font-semibold">
                                Privilige
                            </h3>
                            <h1>{localUser?.tables && localUser.tables.length > 0 ? '' : 'No Previllege'}</h1>
                            {localUser?.tables.map((item, idx) => {
                                const match = item.table.match(/`[^`]+`\.`([^`]+)`/);
                                const tableName = match ? match[1] : item.table;

                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b py-1">
                                        <div className="w-56">{item.permissions.join(", ")}</div>
                                        <div className="">{tableName}</div>
                                        <button
                                            className="text-xs text-red-600 hover:underline"
                                            onClick={() => handleRevokePermission(tableName, item.permissions)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="w-full flex justify-between pr-4 mt-2">
                                <div className="">
                                    <h1 className="my-2 font-semibold">Tables:</h1>
                                    {tables.map(table => (
                                    <label key={table} className="flex items-center gap-2">
                                        <input type="checkbox"
                                            checked={localTables.includes(table)}
                                            onChange={() => handleTableToggle(table)}
                                        />
                                        <span>{table}</span>
                                    </label>
                                    ))}
                                </div>
                                
                                <div>
                                    <h1 className="my-2 font-semibold">Permissions:</h1>
                                    {permissions.map(permission => (
                                        <label key={permission} className="flex items-center gap-2">
                                            <input type="checkbox"
                                                checked={localPerms.includes(permission)}
                                                onChange={() => handlePermissionToggle(permission)}
                                                disabled={localTables.length === 0}
                                            />
                                            <span>{permission}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center space-x-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onDelete(user)}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Delete Role
                    </button>
                    {selectedTab === "roles" ? (
                        <button onClick={handleSave}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save
                        </button>
                    ) : (
                        <button onClick={handleGrantPermission}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Grant Previlige
                        </button>
                    )}
                    
                </div>
            </div>
        </div>
    );
};

export default UserModal;
