import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteRemoteAccount } from './accountDeletion'

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getUser: mocks.getUser }, storage: { from: mocks.from }, rpc: mocks.rpc },
}))

describe('exclusão remota da conta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({ exists: mocks.exists, remove: mocks.remove })
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'pessoa-a' } }, error: null })
    mocks.exists.mockResolvedValue({ data: false, error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  it('exclui a conta sem tentar remover foto ausente', async () => {
    await deleteRemoteAccount('pessoa-a', 'EXCLUIR')

    expect(mocks.from).toHaveBeenCalledWith('profile-avatars')
    expect(mocks.exists).toHaveBeenCalledWith('pessoa-a/avatar.jpg')
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('delete_my_account', { confirmation: 'EXCLUIR' })
  })

  it('remove somente a própria foto antes de excluir a conta', async () => {
    const order: string[] = []
    mocks.exists.mockResolvedValue({ data: true, error: null })
    mocks.remove.mockImplementation(async () => { order.push('foto'); return { error: null } })
    mocks.rpc.mockImplementation(async () => { order.push('conta'); return { error: null } })

    await deleteRemoteAccount('pessoa-a', 'EXCLUIR')

    expect(mocks.remove).toHaveBeenCalledWith(['pessoa-a/avatar.jpg'])
    expect(order).toEqual(['foto', 'conta'])
  })

  it('não exclui a conta se a foto não puder ser consultada ou removida', async () => {
    mocks.exists.mockResolvedValueOnce({ data: null, error: new Error('sem conexão') })
    await expect(deleteRemoteAccount('pessoa-a', 'EXCLUIR')).rejects.toThrow('sem conexão')
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.exists.mockResolvedValue({ data: true, error: null })
    mocks.remove.mockResolvedValueOnce({ error: new Error('falha ao apagar foto') })
    await expect(deleteRemoteAccount('pessoa-a', 'EXCLUIR')).rejects.toThrow('falha ao apagar foto')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('não exclui outra conta após uma troca de sessão', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'pessoa-b' } }, error: null })
    await expect(deleteRemoteAccount('pessoa-a', 'EXCLUIR')).rejects.toThrow('A conta ativa mudou')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
