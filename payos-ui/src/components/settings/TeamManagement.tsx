import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Trash2, Shield, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface TeamMember {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  name?: string;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}

export function TeamManagement() {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  
  // Remove member modal state
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Change role state
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  async function loadTeamData() {
    try {
      setLoading(true);
      setError(null);
      
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`${API_URL}/v1/organization/team`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/v1/organization/team/invites`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      if (!membersRes.ok || !invitesRes.ok) {
        throw new Error('Failed to load team data');
      }

      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();

      setMembers(membersData.members || []);
      setInvites(invitesData.invites || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    try {
      const response = await fetch(`${API_URL}/v1/organization/team/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          name: inviteName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invite');
      }

      setInviteSuccess(true);
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('member');
        loadTeamData(); // Reload to show new invite
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    setChangingRole(memberId);
    
    try {
      const response = await fetch(`${API_URL}/v1/organization/team/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change role');
      }

      loadTeamData(); // Reload to show updated role
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;
    
    setRemoveLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/v1/organization/team/${memberToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      setRemoveModalOpen(false);
      setMemberToRemove(null);
      loadTeamData(); // Reload to show updated list
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemoveLoading(false);
    }
  }

  const canInvite = user?.role === 'owner' || user?.role === 'admin';
  const canManageRoles = user?.role === 'owner' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your team members and their roles
              </CardDescription>
            </div>
            {canInvite && (
              <Button
                onClick={() => setInviteModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Joined
                  </th>
                  {canManageRoles && (
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isCurrentUser = member.id === user?.id;
                  const isOwner = member.role === 'owner';
                  const canModify = canManageRoles && !isCurrentUser && !(user?.role === 'admin' && (isOwner || member.role === 'admin'));
                  
                  return (
                    <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                            {member.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.name}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="ml-2">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {member.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {canModify && !changingRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleChangeRole(member.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant={
                              member.role === 'owner' ? 'default' :
                              member.role === 'admin' ? 'secondary' :
                              'outline'
                            }
                            className="capitalize"
                          >
                            {changingRole === member.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {member.role}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      {canManageRoles && (
                        <td className="py-4 px-4 text-right">
                          {canModify ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemberToRemove(member);
                                setRemoveModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canInvite && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invites
            </CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invite.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                      {invite.expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite}>
            <div className="space-y-4 py-4">
              {inviteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              )}
              
              {inviteSuccess && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Invitation sent successfully!
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteLoading || inviteSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={inviteLoading || inviteSuccess}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value: any) => setInviteRole(value)}
                  disabled={inviteLoading || inviteSuccess}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role === 'owner' && (
                      <SelectItem value="admin">Admin - Full access except ownership transfer</SelectItem>
                    )}
                    <SelectItem value="member">Member - Can manage resources</SelectItem>
                    <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviteLoading || inviteSuccess}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteLoading || inviteSuccess}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Modal */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from your organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This user will immediately lose access to all organization resources.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveModalOpen(false)}
              disabled={removeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeLoading}
            >
              {removeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

