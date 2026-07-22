import ChangePasswordModal from './ChangePasswordModal';

export function ForcePasswordChange() {
  return (
    <ChangePasswordModal
      isOpen
      mode="authenticated"
      onClose={() => undefined}
      onPasswordChanged={() => {
        window.location.assign('/dashboard');
      }}
    />
  );
}
