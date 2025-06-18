const handleBasicInfoUpdate = async () => {
    if (!validateBasicInfo()) {
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('오류', '로그인이 필요합니다.');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/update-basic-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: basicInfo.name,
          username: basicInfo.username,
          email: basicInfo.email,
          birth_date: basicInfo.birthDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('userToken');
          Alert.alert('오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
          navigation.navigate('Login');
          return;
        }
        throw new Error(data.error || 'Failed to update basic information');
      }

      // 업데이트된 사용자 정보로 상태 업데이트
      setUserInfo(prev => ({
        ...prev,
        ...data.user
      }));

      // 성공 메시지 표시
      Alert.alert(
        translate('success'),
        translate('basicInfoUpdateSuccess'),
        [{ text: translate('ok') }]
      );

      // 편집 모드 종료
      setIsEditingBasicInfo(false);
    } catch (error) {
      console.error('Error updating basic info:', error);
      Alert.alert(
        translate('error'),
        error.message || translate('basicInfoUpdateError'),
        [{ text: translate('ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateBasicInfo = () => {
    // 이름 검증
    if (!basicInfo.name.trim()) {
      Alert.alert(translate('error'), translate('nameRequired'));
      return false;
    }

    // 사용자명 검증
    if (!basicInfo.username.trim()) {
      Alert.alert(translate('error'), translate('usernameRequired'));
      return false;
    }
    if (basicInfo.username.length < 3) {
      Alert.alert(translate('error'), translate('usernameTooShort'));
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(basicInfo.username)) {
      Alert.alert(translate('error'), translate('usernameInvalid'));
      return false;
    }

    // 이메일 검증
    if (!basicInfo.email.trim()) {
      Alert.alert(translate('error'), translate('emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(basicInfo.email)) {
      Alert.alert(translate('error'), translate('emailInvalid'));
      return false;
    }

    // 생년월일 검증
    if (!basicInfo.birthDate) {
      Alert.alert(translate('error'), translate('birthDateRequired'));
      return false;
    }

    return true;
  }; 