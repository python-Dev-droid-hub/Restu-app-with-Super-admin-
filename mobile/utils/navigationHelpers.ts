/** Root stack navigator from a nested tab/screen navigator. */
export function getRootStackNavigation(navigation: {
  getParent?: () => unknown;
  navigate: (...args: unknown[]) => void;
}) {
  let nav: any = navigation;
  while (nav?.getParent?.()) {
    nav = nav.getParent();
  }
  return nav;
}

export function navigateOnRootStack(
  navigation: { getParent?: () => unknown; navigate: (...args: unknown[]) => void },
  screen: string,
  params?: object
) {
  const root = getRootStackNavigation(navigation);
  root?.navigate(screen, params);
}
