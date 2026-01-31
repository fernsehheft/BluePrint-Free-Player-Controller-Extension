import React, { useEffect, useState, useCallback } from 'react';
import { ServerContext } from '@/state/server';
import http from '@/api/http';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUser, faBan, faGavel, faCrown, faTimes, faServer, faUsers, faGlobe, faShieldAlt, faSync, faHeart, faHamburger, faClock, faEye, faEyeSlash, faFingerprint, faTerminal, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import tw from 'twin.macro';
import styled, { css } from 'styled-components/macro';
import { useHistory } from 'react-router-dom';

const Container = styled.div`
    ${tw`flex h-full min-h-[80vh] gap-4 text-gray-200 font-sans`};
`;

const Panel = styled.div<{ noPadding?: boolean }>`
    ${tw`rounded-xl bg-gray-700 bg-opacity-20 border border-gray-700`};
    ${props => !props.noPadding && tw`p-4`};
`;

const SidebarButton = styled.button<{ active?: boolean }>`
    ${tw`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 mb-1 text-sm font-medium`};
    ${props => props.active
        ? tw`bg-indigo-600 text-white`
        : tw`text-gray-400 hover:text-white hover:bg-gray-700`
    };
`;

const PlayerRow = styled.div<{ active?: boolean }>`
    ${tw`p-3 rounded-lg cursor-pointer transition-colors border mb-2 flex items-center gap-3`};
    ${props => props.active
        ? tw`bg-gray-700 border-indigo-500`
        : tw`bg-gray-800 border-transparent hover:bg-gray-700`
    };
`;

const ActionButton = styled.button<{ variant?: 'danger' | 'primary' | 'secondary' }>`
    ${tw`px-3 py-2 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2`};
    ${props => props.variant === 'danger' && tw`bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20`};
    ${props => props.variant === 'primary' && tw`bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20`};
    ${props => (!props.variant || props.variant === 'secondary') && tw`bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600`};
`;

const Input = styled.input`
    ${tw`w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-500`};
`;

const ModalOverlay = styled.div`
    ${tw`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm`};
`;

const ModalContent = styled.div`
    ${tw`bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md shadow-2xl relative`};
`;

interface Player {
    uuid: string;
    username: string;
    avatar: string;
    ip: string;
    rank: string;
    ops: boolean;
    status: 'online' | 'offline';
    whitelisted: boolean;
    world: string;
    health: number;
    healthMax: number;
    food: number;
    level: number;
}

export default () => {
    const history = useHistory();
    const server = ServerContext.useStoreState(state => state.server.data);
    const serverStatus = ServerContext.useStoreState(state => state.status.value);
    const socket = ServerContext.useStoreState(state => state.socket.instance);
    const connected = ServerContext.useStoreState(state => state.socket.connected);

    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scanning, setScanning] = useState(false);
    const [deepScanning, setDeepScanning] = useState(false);
    const [showIp, setShowIp] = useState(false);

    const [modalAction, setModalAction] = useState<'kick' | 'ban' | null>(null);
    const [reason, setReason] = useState('');

    const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

    const extract = (regex: RegExp, str: string) => {
        const clean = stripAnsi(str);
        const match = clean.match(regex);
        return match ? match[1] : null;
    };

    const handleConsoleOutput = useCallback((rawLine: string) => {
        const line = stripAnsi(rawLine);

        const vanillaMatch = line.match(/players online:(.*)/i);
        const essentialsMatch = line.match(/Online players \(\d+\/\d+\):(.*)/i);

        let uList = '';
        if (vanillaMatch && vanillaMatch[1]) uList = vanillaMatch[1];
        else if (essentialsMatch && essentialsMatch[1]) uList = essentialsMatch[1];
        else if (line.includes('Total players online:')) {
        }

        if (uList) {
            const names = uList.split(',').map(s => s.trim().split(' ')[0])
                .filter(s => s.length > 0);

            setPlayers(prev => {
                const newPlayers = names.map(name => {
                    const existing = prev.find(p => p.username === name);
                    const avatarUrl = existing?.uuid && existing.uuid !== 'loading...'
                        ? `https://mineskin.eu/helm/${existing.uuid}/100.png`
                        : `https://mineskin.eu/helm/${name}/100.png`;

                    return existing || {
                        uuid: 'loading...',
                        username: name,
                        avatar: avatarUrl,
                        ip: 'Hidden',
                        rank: 'User',
                        ops: false,
                        status: 'online',
                        whitelisted: false,
                        world: 'Unknown',
                        health: 20,
                        healthMax: 20,
                        food: 20,
                        level: 0
                    };
                });
                return newPlayers;
            });
            setScanning(false);
        }

        if (selectedPlayer && (line.includes(selectedPlayer.username) || line.includes('entity data'))) {
            const h = extract(/Health:\s*([\d\.]+)f?/, line);
            const f = extract(/foodLevel:\s*(\d+)/, line);
            const w = extract(/Dimension:\s*"?(minecraft:[\w_]+)"?/, line);

            const ip = extract(/IP Address:\s*([\d\.]+)/, line);
            const worldEss = extract(/World:\s*([\w_]+)/, line);
            const gm = extract(/Game Mode:\s*(\w+)/, line);

            if (h || f || w || ip || worldEss || gm) {
                const updated = {
                    health: h ? parseFloat(h) : selectedPlayer.health,
                    food: f ? parseInt(f) : selectedPlayer.food,
                    world: w || worldEss || selectedPlayer.world,
                    ip: ip || selectedPlayer.ip,
                    ops: gm === 'Creative' && !selectedPlayer.ops ? true : selectedPlayer.ops
                };

                setSelectedPlayer(prev => prev ? ({ ...prev, ...updated }) : null);
                setPlayers(prev => prev.map(p => p.username === selectedPlayer.username ? { ...p, ...updated } : p));

                if (h || f || ip) setDeepScanning(false);
            }
        }

        const ipMatch = line.match(/(\w+)\[.*[\\/]([\d\.]+):\d+\] logged in/);
        if (ipMatch && ipMatch[1] && ipMatch[2]) {
            const [_, pName, pIp] = ipMatch;
            setPlayers(prev => prev.map(p => p.username === pName ? { ...p, ip: pIp } : p));
            if (selectedPlayer?.username === pName) setSelectedPlayer(prev => prev ? { ...prev, ip: pIp } : null);
        }

        const opMatch = line.match(/Made (.*) a server operator/i);
        const deopMatch = line.match(/Made (.*) no longer a server operator/i);

        if (opMatch && opMatch[1]) {
            const opName = opMatch[1].trim();
            setPlayers(prev => prev.map(p => p.username === opName ? { ...p, ops: true } : p));
            if (selectedPlayer?.username === opName) setSelectedPlayer(prev => prev ? { ...prev, ops: true } : null);
        }

        if (deopMatch && deopMatch[1]) {
            const deopName = deopMatch[1].trim();
            setPlayers(prev => prev.map(p => p.username === deopName ? { ...p, ops: false } : p));
            if (selectedPlayer?.username === deopName) setSelectedPlayer(prev => prev ? { ...prev, ops: false } : null);
        }

        const uuidMatch = line.match(/UUID of player (.*) is (.*)/i);
        if (uuidMatch && uuidMatch[1] && uuidMatch[2]) {
            const uName = uuidMatch[1].trim();
            const uUuid = uuidMatch[2].trim();
            setPlayers(prev => prev.map(p => p.username === uName ? {
                ...p,
                uuid: uUuid,
                avatar: `https://mineskin.eu/helm/${uUuid}/100.png`
            } : p));
            if (selectedPlayer?.username === uName) setSelectedPlayer(prev => prev ? { ...prev, uuid: uUuid } : null);
        }
    }, [selectedPlayer]);

    const syncOps = useCallback(() => {
        if (!server) return;
        http.get(`/api/client/servers/${server.uuid}/files/contents`, { params: { file: 'ops.json' } })
            .then(({ data }) => {
                try {
                    let content = data;
                    if (typeof data !== 'string') {
                        content = JSON.stringify(data);
                    }

                    const opsData = JSON.parse(content);
                    if (Array.isArray(opsData)) {
                        const opNames = opsData.map((o: any) => o.name ? o.name.toLowerCase() : '');
                        setPlayers(prev => prev.map(p => {
                            const isOp = opNames.includes(p.username.toLowerCase());
                            return { ...p, ops: isOp };
                        }));

                        setSelectedPlayer(curr => {
                            if (!curr) return null;
                            const isOp = opNames.includes(curr.username.toLowerCase());
                            return { ...curr, ops: isOp };
                        });
                    }
                } catch (e) {
                }
            })
            .catch(() => { });
    }, [server]);

    useEffect(() => {
        if (connected && socket) {
            const listener = (data: string) => handleConsoleOutput(data);
            socket.addListener('console output', listener);
            return () => { socket.removeListener('console output', listener); };
        }
    }, [connected, socket, handleConsoleOutput]);

    const hasLoaded = React.useRef(false);

    useEffect(() => {
        if (connected && socket && !hasLoaded.current) {
            hasLoaded.current = true;
            refreshPlayers();
            syncOps();
        }
    }, [connected]);

    useEffect(() => {
        const loadingPlayers = players.filter(p => p.uuid === 'loading...');
        if (loadingPlayers.length === 0) return;

        const batch = loadingPlayers.slice(0, 3);
        let isMounted = true;

        const fetchPromises = batch.map(player => {
            const cleanName = stripAnsi(player.username).trim();
            return fetch(`https://api.ashcon.app/mojang/v2/user/${cleanName}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => ({ username: player.username, data: d }))
                .catch(() => ({ username: player.username, data: null }));
        });

        const timer = setTimeout(() => {
            Promise.all(fetchPromises).then(results => {
                if (!isMounted) return;

                setPlayers(prev => {
                    let newPlayers = [...prev];
                    results.forEach(res => {
                        const { username, data } = res;
                        if (data && data.uuid) {
                            newPlayers = newPlayers.map(p => p.username === username ? {
                                ...p,
                                uuid: data.uuid,
                                avatar: `https://mineskin.eu/helm/${data.uuid}/100.png`
                            } : p);
                        } else {
                            newPlayers = newPlayers.map(p => p.username === username ? {
                                ...p,
                                uuid: p.username,
                                avatar: `https://mineskin.eu/helm/${p.username}/100.png`
                            } : p);
                        }
                    });
                    return newPlayers;
                });
            });
        }, 800);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [players]);


    const refreshPlayers = () => {
        if (!socket || !connected) return;
        setScanning(true);
        socket.send('send command', 'list');
        setTimeout(() => setScanning(false), 2000);
        syncOps();
    };

    const deepScan = () => {
        if (!socket || !connected || !selectedPlayer) return;
        setDeepScanning(true);
        socket.send('send command', `data get entity ${selectedPlayer.username}`);
        setTimeout(() => setDeepScanning(false), 3000);
    };

    const toggleOp = () => {
        if (!selectedPlayer || !server) return;
        const cmd = selectedPlayer.ops ? `deop ${selectedPlayer.username}` : `op ${selectedPlayer.username}`;

        http.post(`/api/client/servers/${server.uuid}/command`, { command: cmd })
            .then(() => {
                const newOpState = !selectedPlayer.ops;
                setSelectedPlayer(prev => prev ? ({ ...prev, ops: newOpState }) : null);
                setPlayers(prev => prev.map(p => p.username === selectedPlayer.username ? { ...p, ops: newOpState } : p));

                setTimeout(syncOps, 1000);
            });
    };

    const submitModalAction = () => {
        if (!selectedPlayer || !server || !modalAction) return;

        const reasonStr = reason.trim() ? reason.trim() : 'Operator Action';
        const cmd = modalAction === 'ban'
            ? `ban ${selectedPlayer.username} ${reasonStr}`
            : `kick ${selectedPlayer.username} ${reasonStr}`;

        http.post(`/api/client/servers/${server.uuid}/command`, { command: cmd })
            .then(() => {
                setModalAction(null);
                setReason('');
                if (modalAction === 'kick') {
                    setPlayers(prev => prev.filter(p => p.username !== selectedPlayer.username));
                    setSelectedPlayer(null);
                }
            });
    };


    const filtered = players.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Container>
            {modalAction && (
                <ModalOverlay>
                    <ModalContent>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />
                                {modalAction} {selectedPlayer?.username}
                            </h3>
                            <button onClick={() => setModalAction(null)} className="text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
                        </div>
                        <p className="text-gray-400 mb-2 text-sm">
                            Reason (Active for {modalAction === 'ban' ? 'ban appeal' : 'kick message'})
                        </p>
                        <Input
                            autoFocus
                            placeholder="Optional reason..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitModalAction()}
                            className="mb-6"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setModalAction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
                            <button
                                onClick={submitModalAction}
                                className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${modalAction === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                            >
                                Confirm {modalAction}
                            </button>
                        </div>
                    </ModalContent>
                </ModalOverlay>
            )}

            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
                <Panel>
                    <div className="mb-4 px-2">
                        <h2 className="text-lg font-bold text-white">Player Manager</h2>
                        <p className="text-xs text-gray-400">v1.2.0 • Native</p>
                    </div>
                    <SidebarButton onClick={() => history.push(`/server/${server?.id}`)}>
                        <FontAwesomeIcon icon={faServer} /> Overview
                    </SidebarButton>
                    <SidebarButton active>
                        <FontAwesomeIcon icon={faUsers} /> Player List
                    </SidebarButton>
                </Panel>

                <Panel>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Status</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${serverStatus === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {serverStatus === 'running' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    {serverStatus === 'running' ? (
                        <>
                            <div className="flex items-end gap-2 text-white">
                                <span className="text-3xl font-bold">{players.length}</span>
                                <span className="text-sm text-gray-400 mb-1">/ {server?.featureLimits?.players || 20}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Online Players</div>
                        </>
                    ) : (
                        <div className="text-xs text-gray-500 italic mt-2">Server must be online to manage players correctly.</div>
                    )}
                </Panel>
            </div>

            <div className="flex-1 flex gap-4 min-w-0">
                <div className="w-72 flex flex-col">
                    <div className="flex gap-4 mb-4 items-center">
                        <div className="flex-1">
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={refreshPlayers}
                            disabled={!socket || !connected}
                            className={`flex-shrink-0 p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors border border-gray-600 ${scanning && 'animate-pulse'}`}
                            title="Refresh List"
                        >
                            <FontAwesomeIcon icon={faSync} spin={scanning} />
                        </button>
                    </div>

                    <div className="overflow-y-auto pr-1 flex-1">
                        {filtered.length === 0 ? (
                            <div className="text-center p-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                                <FontAwesomeIcon icon={faUsers} className="text-2xl mb-2 opacity-30" />
                                <p className="text-sm">No players</p>
                            </div>
                        ) : filtered.map(p => (
                            <PlayerRow
                                key={p.username}
                                active={selectedPlayer?.username === p.username}
                                onClick={() => setSelectedPlayer(p)}
                            >
                                <img src={p.avatar} className="w-8 h-8 rounded shadow-sm bg-gray-900" alt="" onError={(e) => { e.currentTarget.src = `https://mineskin.eu/helm/${p.username}/100.png` }} />
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-sm text-gray-200 truncate">{p.username}</h4>
                                    <div className="text-[10px] text-gray-500 font-mono truncate">{p.uuid}</div>
                                </div>
                            </PlayerRow>
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {selectedPlayer ? (
                        <Panel className="h-full flex flex-col">
                            <div className="flex items-start gap-6 border-b border-gray-700 pb-6 mb-6">
                                <img src={selectedPlayer.avatar} className="w-20 h-20 rounded-lg bg-gray-900 shadow-xl" alt="" />
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-white mb-2">{selectedPlayer.username}</h1>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600">User</span>
                                        {selectedPlayer.ops && <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-500/20">Operator</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono select-all bg-gray-800 px-2 py-1 rounded w-fit">
                                        <FontAwesomeIcon icon={faFingerprint} /> {selectedPlayer.uuid}
                                    </div>
                                </div>
                                <div>
                                    <button
                                        onClick={deepScan}
                                        disabled={deepScanning}
                                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded border border-gray-700 transition-colors flex items-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faTerminal} />
                                        {deepScanning ? 'Scanning...' : 'Deep Scan'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-500 uppercase">IP Address</span>
                                        <button onClick={() => setShowIp(!showIp)} className="text-gray-500 hover:text-white"><FontAwesomeIcon icon={showIp ? faEyeSlash : faEye} /></button>
                                    </div>
                                    <div className={`font-mono text-sm text-gray-300 ${!showIp && 'blur-sm select-none'}`}>
                                        {selectedPlayer.ip}
                                    </div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">World Dimension</span>
                                    <div className="font-mono text-sm text-gray-300">{selectedPlayer.world}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                                    <FontAwesomeIcon icon={faHeart} className="text-red-500 mb-1" />
                                    <div className="font-bold text-white">{selectedPlayer.health}</div>
                                    <div className="text-[10px] text-gray-500">HP</div>
                                </div>
                                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                                    <FontAwesomeIcon icon={faHamburger} className="text-yellow-500 mb-1" />
                                    <div className="font-bold text-white">{selectedPlayer.food}</div>
                                    <div className="text-[10px] text-gray-500">Food</div>
                                </div>
                                <div className="text-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                                    <FontAwesomeIcon icon={faClock} className="text-blue-500 mb-1" />
                                    <div className="font-bold text-white">--</div>
                                    <div className="text-[10px] text-gray-500">Time</div>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Moderation</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <ActionButton variant="secondary" onClick={toggleOp}>
                                        <FontAwesomeIcon icon={faShieldAlt} /> {selectedPlayer.ops ? 'Deop' : 'Op'}
                                    </ActionButton>
                                    <ActionButton variant="secondary" onClick={() => setModalAction('kick')}>
                                        <FontAwesomeIcon icon={faTimes} /> Kick
                                    </ActionButton>
                                    <ActionButton variant="danger" onClick={() => setModalAction('ban')}>
                                        <FontAwesomeIcon icon={faBan} /> Ban
                                    </ActionButton>
                                </div>
                            </div>
                        </Panel>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div className="bg-gray-800 p-4 rounded-full mb-3">
                                <FontAwesomeIcon icon={faUser} className="text-3xl opacity-25" />
                            </div>
                            <p className="text-sm">Select player</p>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    );
};
