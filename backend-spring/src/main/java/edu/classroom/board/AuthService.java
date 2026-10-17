package edu.classroom.board;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.AbstractDeserializer;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import java.io.Reader;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.regex.Pattern;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private static final Pattern BEARER = Pattern.compile("(?i)^Bearer +([^\\s]+)$");
  private final SecretKey signingKey;
  private final String issuer;
  private final String audience;
  private final int ttl;
  private final Users users;
  private final JwtParser parser;

  public AuthService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.issuer}") String issuer,
      @Value("${app.jwt.audience}") String audience,
      @Value("${app.jwt.ttl}") int ttl,
      Users users) {
    if (secret == null || !secret.matches("[0-9a-fA-F]{64}")) {
      throw new IllegalArgumentException("JWT_SECRET을 64자리 16진수 난수로 설정하세요.");
    }
    if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
      throw new IllegalArgumentException("JWT_ISSUER와 JWT_AUDIENCE를 설정하세요.");
    }
    if (ttl <= 0) {
      throw new IllegalArgumentException("TOKEN_TTL은 양의 정수 초로 설정하세요.");
    }

    byte[] keyBytes = HexFormat.of().parseHex(secret);
    this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    this.issuer = issuer;
    this.audience = audience;
    this.ttl = ttl;
    this.users = users;
    this.parser = Jwts.parser()
        .json(new AbstractDeserializer<Map<String, ?>>() {
          @Override
          protected Map<String, ?> doDeserialize(Reader reader) throws Exception {
            Map<String, Object> values = new ObjectMapper().readValue(
                reader, new TypeReference<Map<String, Object>>() {});
            if (values.containsKey("exp") && !(values.get("exp") instanceof Number)) {
              throw new IllegalArgumentException("JWT exp는 숫자여야 합니다.");
            }
            return values;
          }
        })
        .verifyWith(signingKey)
        .sig().clear().add(Jwts.SIG.HS256).and()
        .requireIssuer(issuer)
        .requireAudience(audience)
        .build();
  }

  public String issueToken(Users.PublicUser user) {
    return Jwts.builder()
        .subject(Long.toString(user.id()))
        .issuer(issuer)
        .audience().add(audience).and()
        .expiration(Date.from(Instant.now().plusSeconds(ttl)))
        .signWith(signingKey, Jwts.SIG.HS256)
        .compact();
  }

  public long currentUserId(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    var bearer = BEARER.matcher(header == null ? "" : header);
    if (!bearer.matches()) {
      throw new ApiError(401, "TOKEN_REQUIRED", "로그인이 필요합니다. Bearer 토큰을 보내세요.");
    }

    try {
      try {
        return verifiedUserId(parser.parseSignedClaims(bearer.group(1)).getPayload());
      } catch (ExpiredJwtException e) {
        verifiedUserId(e.getClaims());
        throw new ApiError(401, "TOKEN_EXPIRED", "로그인 시간이 만료되었습니다. 다시 로그인하세요.");
      }
    } catch (JwtException | IllegalArgumentException e) {
      throw new ApiError(401, "INVALID_TOKEN", "유효하지 않은 로그인 정보입니다. 다시 로그인하세요.");
    }
  }

  private long verifiedUserId(Claims claims) {
    if (!(claims.get("exp") instanceof Number)
        || !issuer.equals(claims.getIssuer())
        || claims.getAudience() == null
        || !claims.getAudience().contains(audience)
        || !(claims.get("sub") instanceof String subject)
        || !subject.matches("[1-9][0-9]*")) {
      throw new ApiError(401, "INVALID_TOKEN", "토큰의 필수 정보를 확인할 수 없습니다.");
    }
    long userId = Long.parseLong(subject);
    if (users.find(userId) == null) {
      throw new ApiError(401, "INVALID_TOKEN", "토큰에 해당하는 사용자가 없습니다.");
    }
    return userId;
  }

  public void assertOwner(long userId, long authorId) {
    if (userId != authorId) {
      throw new ApiError(403, "FORBIDDEN", "본인이 작성한 기록만 수정하거나 삭제할 수 있습니다.");
    }
  }
}
